const jangle = require('../core')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const routes = {
  auth: require('./routes/auth'),
  notFound: require('./routes/not-found'),
  error: require('./routes/error')
}

const start = ({
  api: {
    port = process.env.PORT || 3000,
    prefix = ''
  } = {}
} = {}) => {
  const apiPath = `${prefix}/api`
  const url = `http://localhost:${port}${apiPath}`
  const relative = (path) => url + path

  const app = express()
  app.use(morgan('tiny'))
  app.use(bodyParser.json())

  return jangle
    .start()
    .then(core => {
      const router = express.Router()

      // Top-level API
      router.get('/', (_req, res) => res.json({
        message: 'Welcome to Jangle API!',
        routes: [
          '/auth'
        ].map(relative)
      }))

      // Authentication API
      router.use('/auth', routes.auth(core, express.Router(), {
        relative: (path) => relative('/auth' + path)
      }))

      app.use(apiPath, router)
      app.use(prefix, routes.notFound)
      app.use(prefix, routes.error)

      app.listen(port, () =>
        console.info(`Jangle API ready at ${url}`)
      )

      return app
    })
}

module.exports = {
  start
}
