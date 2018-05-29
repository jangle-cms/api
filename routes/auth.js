module.exports = (auth, router, { relative }) => {
  router.get('/', (req, res) => res.json({
    message: 'Welcome to the Authentication API!',
    routes: [
      '/can-sign-up',
      '/sign-up',
      '/sign-in'
    ].map(relative)
  }))

  router.get('/can-sign-up', (_req, res, next) =>
    auth.canSignUp()
      .then(canSignUp => res.json({
        error: false,
        message: canSignUp
          ? 'Sign up allowed!'
          : 'Cannot sign up.',
        data: canSignUp
      }))
      .catch(next)
  )

  router.post('/sign-up', (
    { body: { name, email, password } = {} } = {},
    res,
    next
  ) =>
    auth.signUp({ name, email, password })
      .then(user => res.json({
        error: false,
        message: 'Sign up successful!',
        data: user
      }))
      .catch(next)
  )

  router.get('/sign-in', (
    { query: { email, password } = {} } = {},
    res,
    next
  ) =>
    auth.signIn(email, password)
      .then(user => res.json({
        error: false,
        message: 'Sign in successful!',
        data: user
      }))
      .catch(next)
  )

  return router
}
