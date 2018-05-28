const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const start = ({
  api: {
    port = process.env.PORT || 3000,
    prefix
  } = {}
} = {}) => {
  const app = express()
  app.use(morgan('tiny'))
  app.use(bodyParser.json())

  const router = express.Router()

  router.get('/api', (_req, res) => res.json({
    message: 'Welcome to Jangle API!'
  }))

  if (prefix) {
    app.use(prefix, router)
  } else {
    app.use(router)
  }

  app.listen(port, () =>
    console.info(`Jangle API ready at http://localhost:${port}${prefix || ''}/api`)
  )

  return app
}

module.exports = {
  start
}
