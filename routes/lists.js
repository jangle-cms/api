const getToken = (req = {}) =>
  req.get('Authorization') && req.get('Authorization').indexOf('Bearer ') === 0
    ? req.get('Authorization').substring('Bearer '.length)
    : req.query.token

const errors = {
  tokenRequired: 'A token is required.',
  itemNotFound: 'Item not found.'
}

module.exports = (lists, router, { relative }) => {
  const slugToName = Object.keys(lists)
    .reduce((map, name) => ({ ...map, [name.toLowerCase()]: name }), {})
  const list = (slug) =>
    lists[slugToName[slug]]

  router.get('/', (req, res) =>
    res.json({
      error: false,
      message: 'Welcome to the Lists API!',
      data: Object.keys(slugToName)
        .map(slug => '/' + slug)
        .map(relative)
    })
  )

  // Check for list
  router.use('/:name', ({ params: { name } = {} }, res, next) =>
    list(name)
      ? next()
      : next(`Could not find a list of ${name}.`)
  )

  const parse = (str) => {
    try {
      return JSON.parse(str)
    } catch (ignore) {
      return undefined
    }
  }

  const reject = (reason) =>
    Promise.reject(String(reason))

  // Any
  const anyOptions = (query = {}) => ({
    where: parse(query.where)
  })

  router.get('/:name/any', (req, res, next) =>
    Promise.resolve(getToken(req)
      ? list(req.params.name).any(getToken(req), anyOptions(req.query))
      : list(req.params.name).live.any(anyOptions(req.query))
    )
    .then(hasAny => res.json({
      error: false,
      message: hasAny
        ? 'Found some items!'
        : 'No items found.',
      data: hasAny
    }))
    .catch(next)
  )

  // Count
  const countOptions = anyOptions

  router.get('/:name/count', (req, res, next) =>
    Promise.resolve(getToken(req)
      ? list(req.params.name).count(getToken(req), countOptions(req.query))
      : list(req.params.name).live.count(countOptions(req.query))
    )
    .then(count => res.json({
      error: false,
      message: `Found ${count} ${count === 1 ? 'item' : 'items'}.`,
      data: count
    }))
    .catch(next)
  )

  // Find
  const PAGE_SIZE = 5
  const findOptions = ({
    where,
    select,
    populate,
    sort,
    page = 1
  } = {}) => ({
    where: parse(where),
    select: parse(select) || select,
    populate: parse(populate) || populate,
    sort: parse(sort) || sort,
    limit: PAGE_SIZE,
    skip: (page > 0)
      ? (page - 1) * PAGE_SIZE
      : 0
  })

  router.get('/:name', (req, res, next) =>
    Promise.resolve(getToken(req))
      .then(token => Promise.all(
        token
          ? [
            list(req.params.name).count(getToken(req), countOptions(req.query)),
            list(req.params.name).find(getToken(req), findOptions(req.query))
          ]
          : [
            list(req.params.name).live.count(countOptions(req.query)),
            list(req.params.name).live.find(findOptions(req.query))
          ]
      ))
      .then(([ total, items ]) => res.json({
        error: false,
        message: `Found ${total} ${total === 1 ? 'item' : 'items'}.`,
        data: {
          total,
          items
        }
      }))
      .catch(next)
  )

  // Get
  const getOptions = ({ select, populate } = {}) => ({
    select: parse(select) || select,
    populate: parse(populate) || populate
  })

  router.get('/:name/:id', (req, res, next) =>
    Promise.resolve(getToken(req)
      ? list(req.params.name).get(getToken(req), req.params.id, getOptions(req.query))
      : list(req.params.name).live.get(req.params.id, getOptions(req.query))
    )
    .then(item => item
      ? res.json({
        error: false,
        message: `Item found!`,
        data: item
      })
      : reject(errors.itemNotFound)
    )
    .catch(reason =>
      reason.name === 'CastError'
        ? next(errors.itemNotFound)
        : next(reason)
    )
  )

  const withToken = (req, fn) =>
    Promise.resolve(getToken(req))
      .then(token => token
        ? fn(token)
        : reject(errors.tokenRequired)
      )

  // Create
  router.post('/:name', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).create(token, req.body || {})
    )
      .then(item => res.json({
        error: false,
        message: `Item created!`,
        data: item
      }))
      .catch(next)
  )

  // Update & Patch
  const updateHandler = (functionName) => (req, res, next) =>
    withToken(req, token =>
      list(req.params.name)[functionName](token, req.params.id, req.body || {})
    )
      .then(item => res.json({
        error: false,
        message: `Item updated!`,
        data: item
      }))
      .catch(next)

  // Update
  const update = updateHandler('update')
  router.put('/:name/:id', update)

  // Patch
  const patch = updateHandler('patch')
  router.patch('/:name/:id', patch)

  // Remove
  router.delete('/:name/:id', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).remove(token, req.params.id)
    )
      .then(item => res.json({
        error: false,
        message: `Item removed!`,
        data: item
      }))
      .catch(next)
  )

  // Restore
  router.put('/:name/:id/restore', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).rollback(token, req.params.id)
    )
      .then(item => res.json({
        error: false,
        message: `Item restored!`,
        data: item
      }))
      .catch(next)
  )

  // History
  router.get('/:name/:id/history', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).history(token, req.params.id)
    )
      .then(history => res.json({
        error: false,
        message: 'Item history found!',
        data: history
      }))
      .catch(next)
  )

  // Preview
  router.get('/:name/:id/preview/:version', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).previewRollback(token, req.params.id, req.params.version)
    )
      .then(item => res.json({
        error: false,
        message: `Previewing rollback!`,
        data: item
      }))
      .catch(next)
  )

  // Rollback
  router.put('/:name/:id/rollback/:version', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).rollback(token, req.params.id, req.params.version)
    )
      .then(item => res.json({
        error: false,
        message: `Rollback successful!`,
        data: item
      }))
      .catch(next)
  )

  // Publish
  router.put('/:name/:id/publish', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).publish(token, req.params.id)
    )
      .then(history => res.json({
        error: false,
        message: `Item published!`,
        data: history
      }))
      .catch(next)
  )

  // Unpublish
  router.put('/:name/:id/unpublish', (req, res, next) =>
    withToken(req, token =>
      list(req.params.name).unpublish(token, req.params.id)
    )
      .then(history => res.json({
        error: false,
        message: `Item unpublished!`,
        data: history
      }))
      .catch(next)
  )

  // Is Live
  router.get('/:name/:id/is-live', (req, res, next) =>
    list(req.params.name).isLive(req.params.id)
      .then(isLive => res.json({
        error: false,
        message: isLive
          ? `Item is published.`
          : `Item is unpublished.`,
        data: isLive
      }))
      .catch(next)
  )

  return router
}
