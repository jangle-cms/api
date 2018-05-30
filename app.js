const jangle = require('../core')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const routes = {
  auth: require('./routes/auth'),
  lists: require('./routes/lists'),
  notFound: require('./routes/not-found'),
  error: require('./routes/error')
}

const start = ({
  api: {
    port = process.env.PORT || 3000,
    prefix = ''
  } = {},
  core
} = {}) => {
  const apiPath = `${prefix}/api`
  const url = `http://localhost:${port}${apiPath}`
  const relative = (path) => url + path
  const relativeWith = (suffix) => (path) => relative(suffix + path)

  const app = express()
  app.use(morgan('tiny'))
  app.use(bodyParser.json())

  return jangle
    .start(core)
    .then(core => {
      const router = express.Router()

      // Top-level API
      router.get('/', (_req, res) => res.json({
        message: 'Welcome to Jangle API!',
        routes: [
          '/auth',
          '/lists'
        ].map(relative)
      }))

      // Authentication API
      router.use('/auth', routes.auth(core.auth, express.Router(), {
        relative: relativeWith('/auth')
      }))

      router.use('/lists', routes.lists(core.lists, express.Router(), {
        relative: relativeWith('/lists')
      }))

      app.use(apiPath, router)
      app.use(apiPath, routes.notFound)
      app.use(apiPath, routes.error)

      app.listen(port, () =>
        console.info(`Jangle API ready at ${url}`)
      )

      return app
    })
}

module.exports = {
  start,
  Schema: jangle.Schema
}
