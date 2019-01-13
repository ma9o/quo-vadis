function send(){
    let msg = {};
    msg.text = $("#input").val();
    msg.time = Date.now();
    chrome.runtime.sendMessage(msg);
    $("#input").val("")
}

chrome.runtime.onMessage.addListener((msg, sender, callback) => {
    $("#messages").append('<p>'+msg.text+'</p>');
});