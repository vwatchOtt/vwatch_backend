exports.resp = {
  success: (response, message, data) => {
    if (typeof message == 'object') {
      data = message
      message = ''
    }
    message = message || 'success'
    response.status(200)
    response.json({ message: message, code: 200, success: true, data })
  },
  fail: (response, message, data) => {
    message = message || 'Some error has occured, please try again later'
    response.status(500)
    response.json({
      message: message,
      code: 500,
      success: false,
      data,
    })
  },
  unknown: (response, message, data) => {
    message = message || 'Invalid Parameters'
    response.status(400)
    response.json({
      message: message,
      code: 400,
      success: false,
      data,
    })
  },
  notFound: (response, message, data) => {
    message = message || 'Not found'
    response.status(404)
    response.json({
      message: message,
      code: 404,
      success: false,
      data,
    })
  },
  taken: (response, message, data) => {
    message = message || 'Data already taken'
    response.status(422)
    response.json({
      message: message,
      code: 422,
      success: false,
      data,
    })
  },
  unauthorized: (response, message, data) => {
    message = message || 'Access denied'
    response.status(401)
    response.json({
      message: message,
      code: 401,
      success: false,
      data,
    })
  },
  maintinense: (response, message, data) => {
    message =
      message || 'App is under maintinense please be patient will fix soon'
    response.status(204)
    response.json({
      message: message,
      code: 204,
      success: false,
      data,
    })
  },
}
