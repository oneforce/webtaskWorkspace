// 个人的知识、阅读构建系统
// 主要使用
// Instapaper: 作为稍后阅读的汇总
// github: 使用的issue的系统来记录系统
// zenhub: 使用report来做敏捷的scrum的开发
// ifttt: 触发相关的triger
//
// 具体流程
// 1. 文件保存instapaper
// 2. instapaper保存触发 ifttt，保存oneforce/reading issue
// 3. github 的webhook触发，跟新issue的estimate
// 4. github webhook 触发，更新issue的milestone/ assignees
// 5. 当instapaper归档文件，触发ifttt的webhook，调用webtask
// 6. 当webtask调用
// 6.1 根据title，查询issue number
// 6.2 根据issue number，调用更新issue的状态为close


var express    = require('express');
var Webtask    = require('webtask-tools');
var bodyParser = require('body-parser');
// require('es6-promise').polyfill()
var fetch = require('isomorphic-fetch@2.2.0')

var app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


var repo_id = 115079045;
var repo_name = 'oneforce/reading'

app.post('/github/webhook', function (req, res) {
  console.log(req.webtaskContext.secrets);

  var GITHUB_ACCESS_TOKEN = req.webtaskContext.secrets.GITHUB_ACCESS_TOKEN;//1039896e67c1af7aadd00b5171ad693f2f213ca3
  var ZENHUB_ACCESS_TOKEN = req.webtaskContext.secrets.ZENHUB_ACCESS_TOKEN;//4310b1b95113ec54ce90fa51e04d336257d206179c0d3311b8a16af9a77cc261ce750c06b09abc34
  var payload = eval('('+req.body.payload+')');
  if (payload.action === 'opened') {
    fetch(payload.issue.url+'?access_token=' + GITHUB_ACCESS_TOKEN,{
      method:'patch',
      headers: { 'Content-Type': 'application/json' },
      body: '{"milestone":"1","assignees":["oneforce"]}',
    }).then(function(response){
      if(response.status >= 400) {
        throw new Error("failed to update issue");
      } else {
        console.log("set issue[" + payload.issue.number +"] milestone success");
      }
    });
  } else if (payload.action === 'milestoned') {
    fetch('https://api.zenhub.io/p1/repositories/'+repo_id+'/issues/' + payload.issue.number + '/estimate?access_token=' + ZENHUB_ACCESS_TOKEN,
      {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: '{ "estimate": 1 }',
        }).then(function(response){
                if(response.status >= 400) {
                  throw new Error("Bad response from zenhub server when set the estimate");
                } else {
                  console.log("Set issue[" + payload.issue.number +"] estimate success");
                }
        })
  }
  res.sendStatus(200);
});

app.post('/instapaper/archive',function(req,res){
  console.log("get instapaper trigger : ");
  var GITHUB_ACCESS_TOKEN = req.webtaskContext.secrets.GITHUB_ACCESS_TOKEN;//1039896e67c1af7aadd00b5171ad693f2f213ca3
  var ZENHUB_ACCESS_TOKEN = req.webtaskContext.secrets.ZENHUB_ACCESS_TOKEN;//4310b1b95113ec54ce90fa51e04d336257d206179c0d3311b8a16af9a77cc261ce750c06b09abc34
  var payload = req.body
  var queryString= encodeURIComponent(payload.title.replace(/\s/g, '+'));
  var queryIssueUrl = "https://api.github.com/search/issues?q=" + queryString + "+repo:"+repo_name+"&sort=created&order=desc";
  console.log("the query issue url is : " + queryIssueUrl);
  fetch(queryIssueUrl).then(function(response){
    console.log(response.status);
      if(response.status >= 400) {
        throw new Error("failed query the issue by title [" + payload.title +"]");
      } else {
        return response.json();
      }
    }).then(function(responseJson){
      console.log("query issue success, count :"+ responseJson.total_count);
      for(var i in responseJson.items){
        var issue = responseJson.items[i]
        fetch(issue.url + '?access_token='+GITHUB_ACCESS_TOKEN,{
          method:'patch',
          headers: { 'Content-Type': 'application/json' },
          body: '{"state":"closed"}'
        }) .then(function(response){
          if(response.status >= 400) {
            throw new Error("Bad response from github server");
          } else {
            console.log("close issue success");
          }
        })
      }
    })
    res.sendStatus(200);
});

module.exports = Webtask.fromExpress(app);
