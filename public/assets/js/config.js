
var host = "broker.emqx.io";
var port = 8083; 
var path = "/mqtt";
var useTLS = false; 
var cleansession = true;

var username = "";
var password = "";


var topic_prefix = "gusalit/gate";
var topic_sub = topic_prefix + "/#";
var topic_cmd = topic_prefix + "/command";

var clientIdPrefix = "web_gusalit_" + Math.random().toString(16).substr(2, 5);