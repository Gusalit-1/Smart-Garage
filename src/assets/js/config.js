var host = "broker.emqx.io";
var port = 8084;          
var path = "/mqtt";
var useTLS = true;
var cleansession = true;

var username = "";
var password = "";

var topic_prefix = "gusalit/gate";
var topic_sub = topic_prefix + "/#";
var topic_cmd = topic_prefix + "/command";

var clientIdPrefix = "web_gusalit_";