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

    module.exports.getTs = function(strtime){
        let ts = (new Date(strtime)).getTime() / 1000
        // console.log(ts)
        return ts
    }
    
    module.exports.isBlacklisted = function(userid) {
        
        if(module.exports.settings.blacklist) {
            return module.exports.settings.blacklist.includes(userid);
        }
        return false;
    }


async function getAccount(userid) {
    // debug("get acc user " + userid);
    var users = await golos.api.getAccountsAsync([userid]);
    if(users && users.length > 0) {
        return users[0];
    } 
    return null;
}


function convertVerstings(vesting, globalstate) {
    let total_vesting_fund_steem = globalstate.total_vesting_fund_steem
    let SPMV = 1000000.0 * parseFloat(globalstate.total_vesting_fund_steem.split(" ")[0]) / parseFloat(globalstate.total_vesting_shares.split(" ")[0])
    return SPMV * vesting / 1000000;
}

function convertGolos(golos) {
    let SPMV = 1000000.0 * parseFloat(props.total_vesting_fund_steem.split(" ")[0]) / parseFloat(props.total_vesting_shares.split(" ")[0]);
    return 1000000 * golos / SPMV;
}

module.exports.convertVestingToGolos = function (vesting, total_vests) {
    let vests = parseFloat(vesting.split(" ")[0]);
    return (convertVerstings(vests).toFixed(3) + " GOLOS");
}

module.exports.convertGolosToVesting = function (golos) {
    golos = parseFloat(golos.split(" ")[0]);
    return (convertGolos(golos).toFixed(6) + " GESTS");
}

async function getUserGests(userid) {
    let user = await getAccount(userid);
    let globalstate = await golos.api.getDynamicGlobalPropertiesAsync()
    // console.log("Total vests", globalstate)
    let ret = convertVerstings(parseFloat(user.vesting_shares.split(" ")[0]), globalstate);
    // debug(userid + " gests " + ret);
    return ret.toFixed(3);
}

module.exports.getUserGests = getUserGests