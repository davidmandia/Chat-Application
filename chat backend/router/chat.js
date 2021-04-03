const router = require('express').Router()
const { index, create, messages, deleteChat, addUserToGroup, leaveCurrentChat} = require('../controllers/chatController')
const {validate} = require('../validators/index')
const { auth } = require('../middleware/auth')




  router.get('/', [auth], index)
  router.post('/create', [auth], create)

  router.get('/messages', [auth], messages)
  router.delete('/:id', [auth], deleteChat)

  router.post('/add-user-to-group', [auth], addUserToGroup)
  router.post('/leave-current-chat', [auth], leaveCurrentChat)



 
  

module.exports = router;