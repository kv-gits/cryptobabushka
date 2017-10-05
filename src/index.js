const ga = require("golos-addons")
golos = ga.golos
const golosjs = require("golos-js")
// console.log(golosjs)

const makeTransfer = async function(wif, userid, receiver, amount, memo) {
    await golosjs.broadcast.transferAsync(wif, userid, 
        receiver, amount, memo);
}

function getNode(){
    var val = document.getElementsByName("node")[0].value
    console.log("Node = ", val)
    consoleLog("Node = " + val)
    return val
}


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

function getBroadcast(){
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

function scanBypass() {
    var text = document.getElementsByName("exclude-text")[0].value
    res = []
    var ar = text.split('\n')
    ar.map(function callback(currentValue, index, array) {
        // Return element for new_array
        // console.log(currentValue)
        res.push(currentValue.toString().trim())
        // console.log(array[index])
    })
    // console.log(res)
    bypass = res
}

//-----------------------------------------------------------------------------
// consoleLog
lines = 1
function consoleLog(line) {
    var consolearea = document.getElementById("console")
    consolearea.value += (lines.toString() + " " + line.toString() + "\n")
    lines++
}
function consoleLogNoLinum(line){
    var consolearea = document.getElementById("console")
    consolearea.value += (lines.toString() + " " + line.toString() + "\n")
}

//----------------------------------------------------------------------------
// Перевод
var failed = []
async function transfer(voter, amount, memo, broadcast, user, key) {
        consoleLog("transfer " + amount + " to " + voter + " (" + memo + ")");
        let sent = false;
        let i = 0;
        for(; !sent && i < 30; i++) {
            try {
                if(broadcast) {
                    global.broadcast = broadcast
                    // var res = await golos.transfer(key, user, voter, amount, memo)
                    await makeTransfer(key, user, voter, amount, memo)
                    console.log("transfered", key, user, res)
                } else {
                    console.log("no broadcasting, no transfer");
                    consoleLog("no broadcasting, no transfer")
                }
                sent = true;
            } catch(e) {
                console.log("Err transfer")
                consoleLog(e)
            }
        }    
        if(i >= 30) {
            log.error("was unable to transfer after 30 tries, exiting")
            failed.push(voter.toString())
            return
        }
    }
    
    async function doTransfers(content, reward, sum_rshares, memo, broadcast, user, key) {
        let sum_transfered = 0;
        content.active_votes.sort((a,b) =>  {return b.rshares - a.rshares});
        for(let v of content.active_votes) {
            consoleLog("user " + v.voter);
            if(bypass.includes(v.voter)) {
                consoleLog("bypass transfer to " + v.voter)
                continue;
            }
            const rshares = v.rshares / 1000000
            console.log("rshares = " + rshares)
            if(rshares <= 0) {
                consoleLog(v.voter + " Was no payout from this user");
                continue;
            }
            let payout = rshares * reward / sum_rshares;
            if(payout < 0.001) {
                consoleLog("user's calculated payout < 0.001, increased to 0.001")
                payout = 0.001;
            }
            consoleLog("user's payout " + payout);
            sum_transfered += payout;
            const amount = payout.toFixed(3) + " GBG";
            await transfer(v.voter, amount, memo, broadcast, user, key)
        }
        consoleLog("\n\ntransferred " + sum_transfered.toFixed(3) + " GBG")
        consoleLog("Список аккаунтов, которым перевод не сделан")
        failed.map( function(val,i,ar){
            consoleLogNoLinum(val)
        })
        lines = 1
    }
    
//-----------------------------------------------------------------------------
// run
async function run(e) {
    //console.log("Bypass", bypass)
    //e.target.disabled = true;
    var broadcast = getBroadcast()
    const node = getNode()
    let permlink = getPermlink()
    let accname = getAccname()
    let pkey = getPkey()
    let PERCENT = getPercent()
    if(!permlink || !accname || !pkey) {
        console.log("Enter valid data")
        consoleLog("Enter Valid data \n")
        lines = 1 //сброс счетчика консоли
        return 0
    }
    const user_gbg = await getUserGBG(accname);
    console.log("Баланс пользователя %d gbg",user_gbg)
    consoleLog(`Баланс пользователя ${user_gbg} gbg`)
    const content = await getContent(accname, permlink)
    // console.log("Контент ",content)
    const infos = await collectInfos(accname, content)
    // console.log(infos)
    console.log("found reward for the post " + infos.author_reward.toFixed(3) + " GBG" )
    consoleLog(`Found reward for the post ${infos.author_reward.toFixed(3)} GBG`)
    const reward = infos.author_reward * PERCENT / 100;
    console.log("reward to pay " + reward.toFixed(3) + " GBG (" + PERCENT + "%)" )
    consoleLog(`Reward to pay ${reward.toFixed(3)} GBG (${PERCENT}%) `)

    
    if(reward > user_gbg) {
        log.error("!!!!  user balance is not enough for reward payout  !!!")
        consoleLog(`!!!!  user balance is not enough for reward payout  !!! \n`)
        lines = 1
        return 0
    }
    const memo = getMemo() + ` https://golos.io/${content.parent_permlink}/@${content.author}/${content.permlink}`;
    consoleLog(`Memo ${memo}`)
    const sum_rshares = sumRshares(content);
    console.log("Mrshares total ", sum_rshares)
    consoleLog(`Mrshares total ${sum_rshares}`)

    if(!broadcast){
        console.log("No broadcast demo payments will be done")
        consoleLog("No broadcast! Demo payments will be done")
    }
    scanBypass()

    await doTransfers(content, reward, sum_rshares, memo, broadcast, accname, pkey);

    // e.target.disabled = false
}

//--------------------------------------------------------------------------
//clear button
document.getElementById("clear-button").addEventListener("click", function(e) {
    var area = document.getElementById("console")
    area.value = ""
    lines = 1
})

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
    // set memo
    document.getElementsByName("memo")[0].value = "Выплата кураторской награды по принципу равного вознаграждения 50 на 50"
    // set bypass
    console.log(bypass)
    var area = document.getElementsByName("exclude-text")[0]
    console.log(area)
    text = ""
    bypass.forEach(function(element) {
        text += (element + '\n')
        area.value = text
    }, this);
}

init()