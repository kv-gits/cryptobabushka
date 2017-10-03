const ga = require("golos-addons")
golos = ga.golos
const golosjs = require("golos-js")


function getAccname(){
    var val = document.getElementsByName("accname")[0].value
    console.log("Accname = ", val)
    return val
}

function getPermlink(){
    var pl = document.getElementsByName("pl")[0].value
    console.log("PL = ", pl)
    return pl
}

function getPkey(){
    var val = document.getElementsByName("wif")[0].value
    console.log("Pkey = ", val)
    return val
}

function getPercent(){
    var val = document.getElementsByName("percent")[0].value
    console.log("Percent = ", val)
    return val
}

function getMemo() {
    // console.log("MEMO")
    var val = document.getElementsByName("memo")[0].value
    return val
}

function getBroadCast(){
    var br = document.getElementsByName("broadcast")[0].checked
    console.log("Broadcast = ", br)
    return br
}


// Получаем контент с голоса
async function getContent(accname, permlink) {
    const content = await golos.getContent(accname, permlink);
    if(!content) {
        console.log("post for the permlink is not found!")
    }
    return content;
}

class Scanner {
    constructor(content) {
        this.content = content;
        this.starttime = Date.parse(content.created);
        this.author_reward = 0;
    }

    process(he) {
        const tr = he[1];
        const time = Date.parse(tr.timestamp);
        if(time < this.starttime) {
            return true;
        }
        const op = tr.op[0];
        const opBody = tr.op[1];

        switch(op) {
            case "author_reward":
                if(opBody.permlink == this.content.permlink) {
                    this.author_reward = parseFloat(opBody.sbd_payout.split(" ")[0]);
                }
                break;
        }
    }
}

async function collectInfos(accname, content) {
    const scanner = new Scanner(content);
    await golos.scanUserHistory(accname, scanner)
    return scanner;
}


async function getUserGBG(USER) {
    //console.log("GBG for ", USER)
    const user = await golos.getAccount(USER);
    if(!user) {
        console.log("account " + USER + " does not exists!")
    }
    console.log(user)
    return parseFloat(user.sbd_balance.split(" ")[0]);
}

function sumRshares(content) {
    let sum = 0;
    for(let v of content.active_votes) {
        if(v.rshares > 0) {
            sum += v.rshares / 1000000;
        }
    }
    return sum;
}


async function transfer(voter, amount, memo, broadcast) {
    
        log.info("transfer " + amount + " to " + voter + " (" + memo + ")");
        let sent = false;
        let i = 0;
        for(; !sent && i < 30; i++) {
            try {
                if(broadcast) {
                    await golos.transfer(KEY, USER, voter, amount, memo);
                } else {
                    log.info("no broadcasting, no transfer");
                }
                sent = true;
            } catch(e) {
                log.error(golos.getExceptionCause(e));
            }
        }    
        if(i >= 3) {
            log.error("was unable to transfer after 3 tries, exiting");
            process.exit(1);
        }
    }
    
    async function doTransfers(content, reward, sum_rshares, memo, broadcast) {
        let sum_transfered = 0;
        content.active_votes.sort((a,b) =>  {return b.rshares - a.rshares});
        for(let v of content.active_votes) {
            log.debug("user " + v.voter);
            if(global.CONFIG.bypass.includes(v.voter)) {
                log.info("bypass transfer to " + v.voter);
                continue;
            }
            const rshares = v.rshares / 1000000;
            log.debug("rshares = " + rshares);
            if(rshares <= 0) {
                log.info(v.voter + " flagged, no payout");
                continue;
            }
            let payout = rshares * reward / sum_rshares;
            if(payout < 0.001) {
                log.debug("user's calculated payout < 0.001, increased to 0.001");
                payout = 0.001;
            }
            log.debug("user's payout " + payout);
            sum_transfered += payout;
            const amount = payout.toFixed(3) + " GBG";
            await transfer(v.voter, amount, memo, broadcast);
        }
        log.info("\n\ntransferred " + sum_transfered.toFixed(3) + " GBG");
    }
    
//-----------------------------------------------------------------------------
// run
async function run(e) {
    console.log("Bypass", bypass)
    //e.target.disabled = true;
    let permlink = getPermlink();
    let accname = getAccname();
    let pKey = getPkey();
    let PERCENT = getPercent()
    if(!permlink || !accname || !pKey) {
        console.log("Enter valid data")
        return 0
    }
    const user_gbg = await getUserGBG(accname);
    console.log("Баланс пользователя %d gbg",user_gbg)
    const content = await getContent(accname, permlink)
    // console.log("Контент ",content)
    const infos = await collectInfos(accname, content)
    // console.log(infos)
    console.log("found reward for the post " + infos.author_reward.toFixed(3) + " GBG" );
    const reward = infos.author_reward * PERCENT / 100;
    console.log("reward to pay " + reward.toFixed(3) + " GBG (" + PERCENT + "%)" );
    
    if(reward > user_gbg) {
        log.error("!!!!  user balance is not enough for reward payout  !!!")
        return 0
    }
    const memo = getMemo()

    const sum_rshares = sumRshares(content);
    console.log("Mrshares total ", sum_rshares)

    if(!broadcast){
        console.log("No broadcast demo payments will be done")
    }

    await doTransfers(content, reward, sum_rshares, memo, broadcast);

    // e.target.disabled = false
}

//--------------------------------------------------------------------------
//click button
var USER, usergbg, permlink, broadcast
document.getElementById("perform").addEventListener("click", function(e) {
    run(e);
})

//setInterval(function(){ console.log("gbg", usergbg); }, 3000);

//console.log(golos)

//--------------------------------------------------------------------------
//Memo
function init() {
    document.getElementsByName("memo")[0].value = "Выплата кураторской награды по принципу равного вознаграждения 50 на 50"
}

init()