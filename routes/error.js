module.exports = (err, req, res, next) => {
  if (typeof err === 'string') {
    res.status(400).json({
      error: true,
      message: err,
      data: null
    })
  } else {
    console.error('ERR', err)
    res.status(500).json({
      error: true,
      message: 'Something went wrong.'
    })
  }
}
