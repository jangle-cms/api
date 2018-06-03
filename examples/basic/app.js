const jangle = require('../../app')
const { Schema } = jangle

jangle.start({
  core: {
    secret: 'super-secret',
    lists: {
      Person: new Schema({
        name: {
          type: String,
          required: true
        },
        age: {
          type: Number,
          required: true
        },
        friend: {
          type: Schema.Types.ObjectId,
          ref: 'Person'
        }
      })
    }
  }
})
