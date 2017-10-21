const golos = require("golos-js");

async function vote(userid, key, author, permlink, weight) {
    await golos.broadcast.voteAsync(key, userid, author, permlink, weight * 100);
}

async function comment(userid, key, parent_author, parent_permlink, comment) {
    let permlink = "re-"+parent_author.replace(/\./g,"") 
    + "-" + parent_permlink + "-" 
    + new Date().toISOString().toLowerCase().replace(/[-.:]/g,"")
    await golos.broadcast.commentAsync(key, 
        parent_author, parent_permlink, 
        userid, permlink, "", comment,
        {
            tags: ["ru--lotereya"]
        });
    }
    
    module.exports.comment = comment
    module.exports.vote = vote
    
    
    
    
    module.exports.formatDateTime = function(ms) {
        var options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            timezone: 'UTC',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        
        return dateFormat(new Date(ms), "dd.mm.yyyy h:MM:ss");
    }
    
    module.exports.isBlacklisted = function(userid) {
        
        if(module.exports.settings.blacklist) {
            return module.exports.settings.blacklist.includes(userid);
        }
        return false;
    }