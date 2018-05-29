const getToken = (req = {}) =>
  req.get('Authorization') && req.get('Authorization').indexOf('Bearer ') === 0
    ? req.get('Authorization').substring('Bearer '.length)
    : req.query.token

module.exports = (lists, router, { relative }) => {
  const slugToName = Object.keys(lists)
    .reduce((map, name) => ({ ...map, [name.toLowerCase()]: name }), {})
  const list = (slug) =>
    lists[slugToName[slug]]

  router.get('/', (req, res) =>
    res.json({
      error: false,
      message: 'Welcome to the Lists API!',
      data: Object.keys(lists)
        .map(name => '/' + name.toLowerCase())
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
  const findOptions = (query = {}) => ({
    where: parse(query.where),
    select: parse(query.select) || query.select,
    populate: parse(query.populate) || query.populate,
    sort: parse(query.sort) || query.sort,
    page: isNaN(parseInt(query.page))
      ? 1
      : parseInt(query.page)
  })

  router.get('/:name', (req, res, next) =>
    Promise.resolve(getToken(req)
      ? list(req.params.name).find(getToken(req), findOptions(req.query))
      : list(req.params.name).live.find(findOptions(req.query))
    )
    .then(items => res.json({
      error: false,
      message: `Found ${items.length} ${items.length === 1 ? 'item' : 'items'}.`,
      data: items
    }))
    .catch(next)
  )

  // Get
  const getOptions = (query = {}) => ({
    select: parse(query.select) || query.select,
    populate: parse(query.populate) || query.populate
  })

  router.get('/:name/:id', (req, res, next) =>
    Promise.resolve(getToken(req)
      ? list(req.params.name).get(getToken(req), req.params.id, getOptions(req.query))
      : list(req.params.name).live.get(req.params.id, getOptions(req.query))
    )
    .then(item => res.json({
      error: false,
      message: `Item found!`,
      data: item
    }))
    .catch(reason =>
      reason.name === 'CastError'
        ? next('Could not find that item.')
        : next(reason)
    )
  )

  return router
}
