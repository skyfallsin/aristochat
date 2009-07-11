AristoChat = {
	bosh_service: 'http://localhost:4000/http-bind/',
	muc_component: 'conference.localhost',
	muc_room: 'testing',
	debug: true,
	connection: null,
	nick: '',
	jid: '',
	password: ''
}

function log(msg) {
    if(AristoChat.debug) {
       $('#log').append('<div></div><br /><br />').append(document.createTextNode(msg));
    }
}

function rawInput(data) {
    log('RECV: ' + data);
}

function rawOutput(data) {
    log('SENT: ' + data);
}

function onMessage(msg) {
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var body = msg.getElementsByTagName("body")[0].childNodes[0];
    var user = Strophe.getResourceFromJid(from);
    
    if (type == "groupchat" && body) {
        body = body.nodeValue.replace(/(<([^>]+)>)/ig,"");
        if(user == AristoChat.nick) {
            $('#chat').append("<tr class='message'><td class='me'>"+ user + "</td><td class='body'>" + body +"</td></tr>");            
        }
        else {
            $('#chat').append("<tr class='message'><td class='nick'>"+ user + "</td><td class='body'>" + body +"</td></tr>");
        }
        $('html, body').animate({scrollTop: $('.message:last').offset().top }, 5);
    }
    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

function user_connected(user) {
    $('#' + user).hide("slow").remove();
    $('#users').append("<li id='" + user + "'>"+ user +"</li>")
    $('#chat').append("<tr class='presence'><td class='nick'>"+ user + "</td><td class='body'>has entered the room</td></tr>");
    $('html, body').animate({scrollTop: $('.message:last').offset().top }, 5);
}

function user_disconnected(user) {
    $('#' + user).hide("slow").remove();
    $('#chat').append("<tr class='presence'><td class='nick'>"+ user + "</td><td class='body'>has left the room</td></tr>");
    $('html, body').animate({scrollTop: $('.message:last').offset().top }, 5);    
}

function onPresence(msg) {
    var user = Strophe.getResourceFromJid(msg.getAttribute('from'));
    var type = msg.getAttribute('type');
    
    if (type == "unavailable") {
        user_disconnected(user);
    }
    else if (type == "error") {
        disconnected();
        alert(msg.getElementsByTagName("text")[0].childNodes[0].nodeValue);
    }
    else {
        user_connected(user);
    }
    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

function onConnect(status) {
    if (status == Strophe.Status.CONNECTING) {
        $('#loader').show();
        log('Strophe is connecting.');
        $('#status').text('Connecting...');
    } else if (status == Strophe.Status.DISCONNECTING) {
        $('#loader').show();
        $('#status').text('Disconnecting...');
        log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.AUTHENTICATING) {
        $('#loader').show();
        $('#status').text('Authenticating...');
        log('Strophe is authenticating.');
    } else if (status == Strophe.Status.CONNFAIL) {
        log('Strophe failed to connect.');
        $('#status').text('Connection failed');
        disconnected();
        $('#loader').hide();
    } else if (status == Strophe.Status.DISCONNECTED) {
        log('Strophe is disconnected.');
        $('#status').text('Disconnected');
        disconnected();
        $('#loader').hide();
    } else if (status == Strophe.Status.AUTHFAIL) {
        $('#status').text('Authentication failed');
        alert("Authentication failed, please retry.");
        disconnected();
        $('#loader').hide();
    } else if (status == Strophe.Status.CONNECTED) {
        // Handlers
        connection.addHandler(onMessage,    null, 'message',        null,    null,  null); 
        connection.addHandler(onPresence,   null, 'presence',       null,    null,  null); 
        connected();
        log('Strophe is connected.');
        // Entrering the room
        connection.send($pres({to: AristoChat.muc_room + "@" + AristoChat.muc_component+ "/" + AristoChat.nick}).c("x", {xmlns: "http://jabber.org/protocol/muc"}).tree());
        $('#loader').hide();
    }
}

function connected() {
    user_connected(AristoChat.nick);
    $('#status').text('Connected');
    $('#connect').get(0).value = 'disconnect';
    $('#login').hide();
    $('#roster').show()
    $('#connect').removeAttr("disabled"); // To enable
    $('#post').removeAttr("disabled"); // To enable
}


function disconnected() {
    if(AristoChat.nick != "") {
        user_disconnected(AristoChat.nick)
    }
    $('#post').attr("disabled", "disabled"); // To disable
    $('#connect').get(0).value = 'connect';
    $('#login').show();
    $('#roster').hide()
    $('#connect').removeAttr("disabled"); // To enable
}


$(document).ready(function () { 
    var last = new Date();
    var items = 0;
    var max_items = 5;
    connection = new Strophe.Connection(AristoChat.bosh_service);
    connection.rawInput  = rawInput;
    connection.rawOutput = rawOutput;
    
    $('#post').bind('click', function () {
        var msg = $('#message_input').get(0).value.replace(/(<([^>]+)>)/ig,"");
        connection.send($msg({to: AristoChat.muc_room+ "@" + AristoChat.muc_component, type: "groupchat", id: connection.getUniqueId}).c("body").t(msg).up().c("nick", {xmlns: "http://jabber.org/protocol/nick"}).t(AristoChat.nick).tree());
         $('#message_input').get(0).value = "";
    });
    
    $('#connect').bind('click', function () {
        var button = $('#connect').get(0);
        if (button.value == 'Connect') {
            $('#connect').attr("disabled", "disabled"); // To disable 
            $('#loader').show();
            if($('#nick').get(0).value == "") {
                AristoChat.nick = Strophe.getNodeFromJid($('#jid').get(0).value);
            }
            else {
                AristoChat.nick = $('#nick').get(0).value;
            }
            AristoChat.jid = $('#jid').get(0).value;
            AristoChat.password = $('#pass').get(0).value;
            connection.connect(AristoChat.jid, AristoChat.password, onConnect);
        } else {
            $('#connect').attr("disabled", "disabled"); // To disable 
            $('#loader').show();
            connection.disconnect();
        }
    });
});
