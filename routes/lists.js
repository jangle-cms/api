const getToken = (req = {}) =>
  req.get('Authorization') && req.get('Authorization').indexOf('Bearer ') === 0
    ? req.get('Authorization').substring('Bearer '.length)
    : req.query.token

const errors = {
  tokenRequired: 'A token is required.',
  listNotFound: 'List not found.',
  itemNotFound: 'Item not found.'
}

module.exports = (lists, router, { relative }) =>
  Promise.all(Object.keys(lists)
    .map(name => lists[name].schema())
  )
    .then(schemas => schemas.reduce((map, schema) => {
      map[schema.slug] = schema.name
      return map
    }, {}))
    .then(slugMap => {
      const withToken = (req) =>
        Promise.resolve(getToken(req))
          .then(token => token || reject(errors.tokenRequired))

      const list = (req) =>
        Promise.resolve(lists[slugMap[req.params.name]])
          .then(list => list || reject(errors.listNotFound))

      const protectedList = (req) =>
        Promise.all([
          withToken(req),
          list(req)
        ])
          .then(([ token, list ]) => ({
            token,
            list
          }))

      const simpleSchema = (slug) =>
        lists[slugMap[slug]].schema()
          .then(schema => {
            delete schema.fields
            return schema
          })

      router.get('/', (req, res) =>
        Promise.resolve(Object.keys(slugMap))
          .then(slugs => Promise.all(slugs.map(simpleSchema)))
          .then(schemas =>
            res.json({
              error: false,
              message: 'Welcome to the Lists API!',
              data: schemas
            })
          )
      )

      // Check for list
      router.use('/:name', (req, res, next) =>
        list(req)
          .then(list => list
            ? next()
            : next(errors.listNotFound)
          )
          .catch(_ => next(errors.listNotFound))
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

      const success = (res, message) => (data) => res.json({
        error: false,
        message: typeof message === 'string'
          ? message
          : message(data),
        data
      })

      router.get('/:name/any', (req, res, next) =>
        Promise.resolve(getToken(req)
          ? protectedList(req).then(({ token, list }) => list.any(token, anyOptions(req.query)))
          : list(req).then(list => list.live.any(anyOptions(req.query)))
        )
        .then(success(res, hasAny =>
          hasAny
            ? 'Found some items.'
            : 'No items found.'
        ))
        .catch(next)
      )

      // Count
      const countOptions = anyOptions

      router.get('/:name/count', (req, res, next) =>
        Promise.resolve(getToken(req)
          ? protectedList(req).then(({ token, list }) => list.count(token, countOptions(req.query)))
          : list(req).then(list => list.live.count(countOptions(req.query)))
        )
        .then(success(res, count =>
          `Found ${count} ${count === 1 ? 'item' : 'items'}.`
        ))
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
                list(req).then(list => list.count(token)(countOptions(req.query))),
                list(req).then(list => list.find(token)(findOptions(req.query)))
              ]
              : [
                list(req).then(list => list.live.count(countOptions(req.query))),
                list(req).then(list => list.live.find(findOptions(req.query)))
              ]
          ))
          .then(([ total, items ]) => res.json({
            error: false,
            message: `Found ${total} ${total === 1 ? 'item' : 'items'}.`,
            data: { total, items }
          }))
          .catch(next)
      )

      // Schema
      router.get('/:name/schema', (req, res, next) =>
        list(req)
          .then(list => list.schema())
          .then(success(res, schema => `Schema found.`))
          .catch(next)
      )

      // Get
      const getOptions = ({ select, populate } = {}) => ({
        select: parse(select) || select,
        populate: parse(populate) || populate
      })

      const rejectIfNull = (item) => item || reject(errors.itemNotFound)

      router.get('/:name/:id', (req, res, next) =>
        Promise.resolve(getToken(req)
          ? protectedList(req).then(({ token, list }) => list.get(getToken(req))(req.params.id, getOptions(req.query)))
          : list(req).then(list => list.live.get(req.params.id, getOptions(req.query)))
        )
        .then(rejectIfNull)
        .then(success(res, item => `Item found.`))
        .catch(reason =>
          reason.name === 'CastError'
            ? next(errors.itemNotFound)
            : next(reason)
        )
      )

      // Create
      router.post('/:name', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.create(token)(req.body || {}))
          .then(success(res, `Item created.`))
          .catch(next)
      )

      // Update & Patch
      const updateHandler = (functionName) => (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list[functionName](token)(req.params.id, req.body || {}))
          .then(success(res, `Item updated.`))
          .catch(next)

      // Update
      const update = updateHandler('update')
      router.put('/:name/:id', update)

      // Patch
      const patch = updateHandler('patch')
      router.patch('/:name/:id', patch)

      // Remove
      router.delete('/:name/:id', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.remove(token)(req.params.id))
          .then(success(res, `Item removed.`))
          .catch(next)
      )

      // Restore
      router.put('/:name/:id/restore', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.rollback(token)(req.params.id))
          .then(success(res, `Item restored.`))
          .catch(next)
      )

      // History
      router.get('/:name/:id/history', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.history(token)(req.params.id))
          .then(success(res, `Item history found.`))
          .catch(next)
      )

      // Preview
      router.get('/:name/:id/preview/:version', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.previewRollback(token)(req.params.id, req.params.version))
          .then(success(res, `Previewing rollback.`))
          .catch(next)
      )

      // Rollback
      router.put('/:name/:id/rollback/:version', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.rollback(token)(req.params.id, req.params.version))
          .then(success(res, `Rollback successful.`))
          .catch(next)
      )

      // Publish
      router.put('/:name/:id/publish', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.publish(token)(req.params.id))
          .then(success(res, `Item published.`))
          .catch(next)
      )

      // Unpublish
      router.put('/:name/:id/unpublish', (req, res, next) =>
        protectedList(req)
          .then(({ token, list }) => list.unpublish(token)(req.params.id))
          .then(success(res, `Item unpublished.`))
          .catch(next)
      )

      // Is Live
      router.get('/:name/:id/is-live', (req, res, next) =>
        list(req)
          .then(list => list.isLive(req.params.id))
          .then(success(res, isLive =>
            isLive
              ? `Item is published.`
              : `Item is unpublished.`
          ))
          .catch(next)
      )

      return router
    }
  )
  .catch(reason => console.error(reason))
