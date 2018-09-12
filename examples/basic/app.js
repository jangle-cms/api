const jangle = require('../../app')
const { Schema } = jangle

jangle.start({
  secret: 'super-secret',
  lists: {
    'Blog Post': new Schema({
      name: {
        label: 'Title',
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true,
        richText: true
      }
    })
  }
})
