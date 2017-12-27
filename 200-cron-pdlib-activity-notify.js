
var Iconv = require('iconv-lite');
var parse5 = require('parse5');
var http=require('http');
var querystring = require('querystring');
//get 请求外网
module.exports = function (context, req, res) {
  console.log("start");
  http.get('http://www.pdlib.com/pdtsg_website/html/defaultsite/pd_tsg_tsfw_setd/List/list_0.htm',function(req,res){
      var html='';
      req.on('data',function(data){
          html+=Iconv.decode(data, 'gb2312').toString();
      });
      req.on('end',function(){
        var document = parse5.parse(html);
        console.log(document.nodeName);
        var ulArrays = document.childNodes[1].childNodes[2].childNodes[11].childNodes[3].childNodes;
        for( var i in ulArrays) {
          var node_i = ulArrays[i];
          //console.log(node_i.nodeName + " : " + node_i.value);
          if(node_i.nodeName == 'ul'){
            // do ul print
            var ul_node = node_i.childNodes;
            for(var j in ul_node){
              var ul_node_j = ul_node[j];
              //console.log("   " + ul_node_j.nodeName + " : " + ul_node_j.value);
              if(ul_node_j.nodeName == 'li') {
                var li_node = ul_node_j;
                var textDate = ul_node_j.childNodes[0].childNodes[0].value;
                var title = ul_node_j.childNodes[1].attrs[1].value;
                var link = 'http://www.pdlib.com/pdtsg_website/html/defaultsite/' + ul_node_j.childNodes[1].attrs[0].value.substr(6);
                console.log("" + textDate + " [" + title + "]: " + link);
                if( textDate == formatDate("yyyy-MM-dd", new Date())) {
                // if(title == '【活动预告】“腹有诗书气自华”中华传统文学经典作品阅读推荐展') {
                  var postData = querystring.stringify({
                    'value1': title,
                    'value2':link
                  });
                  var iftttOption = {
                    hostname: 'maker.ifttt.com',
                    port: 80,
                    path: '/trigger/pdlib_activity/with/key/b7UWX91Bi1QCmbb-1uQzhY',
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Content-Length': Buffer.byteLength(postData)
                    }
                  }
                  var req1 = http.request(iftttOption);
                  req1.write(postData + "\n");
                  req1.end();
                  console.log("The [" + title +"] has been insert your daily work");
                }
            }
          }
        }
      }
    });
  });
  res.writeHead(200, { 'Content-Type': 'text/html '});
  res.end();
}

var formatDate = function(fmt, date) { //author: meizz
  var o = {
    "M+" : date.getMonth()+1,                 //月
    "d+" : date.getDate(),                    //日
    "h+" : date.getHours(),                   //小时
    "m+" : date.getMinutes(),                 //分
    "s+" : date.getSeconds(),                 //秒
    "q+" : Math.floor((date.getMonth()+3)/3), //季度
    "S"  : date.getMilliseconds()             //毫秒
  };
  if(/(y+)/.test(fmt))
    fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)
    if(new RegExp("("+ k +")").test(fmt))
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
}
