const jangle = require('../../app')
const { Schema } = jangle

jangle.start({
  core: {
    secret: 'super-secret',
    lists: {
      People: {
        options: {
          labels: {
            singular: 'Person',
            plural: 'People'
          }
        },
        schema: new Schema({
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
  }
})
