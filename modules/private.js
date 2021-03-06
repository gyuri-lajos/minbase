'use strict'
var h = require('hyperscript')
var u = require('../util')
var pull = require('pull-stream')
var Scroller = require('pull-scroll')
var ref = require('ssb-ref')
var log = require('./scuttlebot').log
var Unbox = require('./helpers-private').unbox

var config = require('../config')()

function map(ary, iter) {
  if(Array.isArray(ary)) return ary.map(iter)
}

exports.needs = {
  message_render: 'first',
  message_compose: 'first'
}

exports.gives = {
  screen_view: true,
  message_content_mini: true
}

exports.create = function (api) {

  function unbox () {
    return pull(
      pull.filter(function (msg) {
        return 'string' == typeof msg.value.content
      }),
      pull.map(function (msg) {
        return Unbox(msg)
      }),
      pull.filter(Boolean)
    )
  }

  return {
    screen_view: function (path) {
      if(path === 'Private') {
        var id = require('../keys').id
        var compose = api.message_compose(
          {type: 'post', recps: [], private: true}, 
            {
            prepublish: function (msg) {
              msg.recps = [id].concat(msg.mentions).filter(function (e) {
                return ref.isFeed('string' === typeof e ? e : e.link)
              })
              if(!msg.recps.length)
                throw new Error('Please select at least one recipient. Use @person to select recipients in the message body.')
              return msg
            },
            placeholder: 'Write a private message. Use @person to select recipients.'
          }
          )
    
        var content = h('div.column.scroller__content')
        var div = h('div.column.scroller',
          {style: {'overflow':'auto'}},
          h('div.scroller__wrapper', compose, content)
        )
    
        pull(
          log({old: false}),
          unbox(),
          Scroller(div, content, api.message_render, true, false)
        )
    
        pull(
          u.next(log, {reverse: true, limit: 1000}),
          unbox(),
          Scroller(div, content, api.message_render, false, false, function (err) {
            if(err) throw err
          })
        )
    
        return div
      }
    },

    /*message_meta: function (msg) {
      if(msg.value.content.recps || msg.value.private)
        return h('span.row', 'PRIVATE', map(msg.value.content.recps, function (id) {
          return api.avatar_image_link('string' == typeof id ? id : id.link, 'thumbnail')
        }))
    },*/

    message_content_mini: function (msg, sbot)  {
      if (typeof msg.value.content === 'string') {
        var icon = config.emojiUrl + 'lock.png'
        return icon
          ? h('img', {className: 'emoji', src: icon})
          : 'PRIVATE'
      }
    }
  }

}

