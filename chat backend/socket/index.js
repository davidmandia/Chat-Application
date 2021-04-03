const socketIo = require('socket.io')
const { sequelize} = require('../models/index')
const Message = require('../models').Message


//key value pairs with built in method
const users = new Map()
const userSockets = new Map()

const SocketServer = ( server) => {
    const io = socketIo(server)

    io.on('connection', (socket) => {
       


        socket.on('join', async (user) => {

            let sockets = []

            if(users.has(user.id)) {
                const existingUser = users.get(user.id)
                existingUser.sockets = [...existingUser.sockets, ...[socket.id]]
                users.set(user.id, existingUser)
                sockets = [...existingUser.sockets, ...[socket.id]]
                userSockets.set(socket.id, user.id)

            } else {
    
                //keep track of all the sockets user have in differnt devices and bbrowsers
                users.set(user.id, {id: user.id, sockets: [socket.id]})
                sockets.push(socket.id)
                userSockets.set(socket.id, user.id)

            }

            const onlineFriends = [] //ids

            const chatters = await getChatters(user.id) //query return an array of id

            console.log(chatters)


            //notify his friends that user is now online
            for ( let i = 0; i < chatters.length; i++) {
                if (users.has(chatters[i])) {
                    const chatter = users.get(chatters[i])
                    chatter.sockets.forEach(socket => {
                        try {
                            io.to(socket).emit('online', user)
                        } catch (e) {
                            console.log(e)
                        }
                    })

                    onlineFriends.push(chatter.id)
                }
            }

            // send to user sockets which of his friends are online
            sockets.forEach(socket => {
                try {
                    io.to(socket).emit('friends', onlineFriends)
                } catch (e) {
                    console.log(e)
                }
            })

        })

        socket.on('message', async (message) => {
            console.log(message, "Message")
            let sockets  = []

            if (users.has(message.fromUserId)) {
                sockets = users.get(message.fromUserId).sockets
            }

            message.toUserId.forEach(id => {
                if (users.has(id)) {
                    sockets = [...sockets, ...users.get(id).sockets]

                }
            })

            try {
                const msg = {
                    type: message.type,
                    fromUserId: message.fromUserId,
                    chatId: message.chatId,
                    message: message.message
                }

                const savedMessage =  await Message.create(msg)

                message.User = message.fromUser
                message.fromUserId = message.fromUserId
                message.id = savedMessage.id
                delete message.fromUser

                sockets.forEach(socket => {
                    io.to(socket).emit('received', message)
                })
            } catch (e) {
                
            }
            


        })

        socket.on('typing', (receiver) => {
           receiver.toUserId.forEach(id => {
               if (users.has(id)){
                   users.get(id).sockets.forEach(socket => {
                     io.to(socket).emit('typing', receiver)

                   })
               }
           }) 
        })


        socket.on('add-friend', ( chats) => {
            try {
                let online = 'offline'
                if(users.has(chats[1].Users[0].id)) {
                    online = 'online'
                    chats[0].Users[0].status = 'online'
                    users.get(chats[1].Users[0].id).sockets.forEach(socket => {
                        //emit to second user so he needs info about first user
                        io.to(socket).emit('new-chat', chats[0])
   
                      })
                }

                if(users.has(chats[0].Users[0].id)) {
                    chats[1].Users[0].status = online
                    users.get(chats[0].Users[0].id).sockets.forEach(socket => {
                        io.to(socket).emit('new-chat', chats[1])
   
                      })
                }
                
            } catch (e) {
                
            }
        })

        socket.on('add-user-to-group', ({ chat, newChatter }) => {
            if(users.has(newChatter.id)) {
                newChatter.status = 'online'
            }

            //old user
                chat.Users.forEach((user, index) => {

                    if( users.has(user.id)) {
                        chat.Users[index].status = 'online'
                        users.get(user.id).sockets.forEach(socket => {
                            try {
                                io.to(socket).emit('added-user-to-group', {chat, chatters: [newChatter] })
                            } catch (e) {
                                console.log(e)
                            }
                        })
                    }
                }
                )

            //to new user

            if(users.has(newChatter.id)) {
                users.get(newChatter.id).sockets.forEach(socket => {
                    try {
                        io.to(socket).emit('added-user-to-group', {chat, chatters: chat.Users })
                    } catch (e) {
                        console.log(e)
                    }
                })
            }
        })

        socket.on('leave-current-chat', (data) => {
            const { chatId, userId, currentUserId, notifyingUsers} = data

            notifyingUsers.forEach(id => {
                if (users.has(id)) {
                    users.get(id).sockets.forEach(socket => {
                        try {
                            io.to(socket).emit('remove-user-from-chat', { chatId, userId, currentUserId})
                        } catch (error) {
                            
                        }
                    })
                }
            })
        })


        socket.on('delete-chat', (data) => {
            const { chatId, notifyingUsers} = data

            notifyingUsers.forEach(id => {
                if (users.has(id)) {
                    users.get(id).sockets.forEach(socket => {
                        try {
                            io.to(socket).emit('delete-chat', parseInt(chatId))
                        } catch (error) {
                            
                        }
                    })
                }
            })
        })



        socket.on('disconnect', async () => {

            if (userSockets.has(socket.id)) {
                const user = users.get(userSockets.get(socket.id))


                if (user.sockets.length > 1) {

                    user.sockets = user.sockets.filter(sock => {
                        if( sock !== socket.id) return true

                        userSockets.delete(sock)
                        return false
                    })

                    users.set(user.id, user)

                } else {
                    const chatters = await getChatters(user.id)

                    for ( let i = 0; i < chatters.length; i++) {
                        if (users.has(chatters[i])) {
                            users.get(chatters[i]).sockets.forEach(socket => {
                                try {
                                    io.to(socket).emit('offline', user)
                                } catch (e) {
                                    console.log(e)
                                }
                            })
        
                        }
                    }

                    userSockets.delete(socket.id)
                    users.delete(user.id)



                }
            }
            

        })
    })

}

const getChatters = async (userId) => {
    try {

        //return the ids of all chats the user is in using chatUsers except from the chat the user is in
        const [ results, metadata] = await sequelize.query(`
            select "cu"."userId" from "ChatUsers" as cu
            inner join (
                select "c"."id" from "Chats" as c
                where exists (
                    select "u"."id" from "Users" as u
                    inner join "ChatUsers" on u.id = "ChatUsers"."userId"
                    where u.id = ${parseInt(userId)} and c.id = "ChatUsers"."chatId"
                 )

            ) as cjoin on cjoin.id = "cu"."chatId"
            where "cu"."userId" != ${parseInt(userId)}
        `)
        return results.length > 0 ? results.map(el => el.userId) : []   
        
    } catch (e) {
        console.log(e)
        return []
    }

}

module.exports = SocketServer