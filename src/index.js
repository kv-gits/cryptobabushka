const ga = require("golos-addons")
golos = ga.golos
const golosjs = require("golos-js")
const gu = require('./golos_utils')
const gb = require('./go_beau')
var pjson = require('./../package.json')
console.log(pjson)

const version = pjson.version
// console.log(golosjs)
const delay = 3000

const makeTransfer = async function(wif, userid, receiver, amount, memo) {
    await golosjs.broadcast.transferAsync(wif, userid, 
        receiver, amount, memo)
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
    if(conf.payer == '') conf.payer = val
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
        consoleLog(`Аккаунт не найден`)
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

const timeout = ms => new Promise(res => setTimeout(res, ms))

var failed = []
async function transfer(voter, amount, memo, broadcast, payer, key, user) {
        consoleLog("transfer " + amount + " to " + voter + " (" + memo + ")");
        let sent = false;
        let i = 0;
        for(; !sent && i < 30; i++) {
            try {
                if(broadcast) {
                    global.broadcast = broadcast
                    // var res = await golos.transfer(key, user, voter, amount, memo)
                    await makeTransfer(key, payer, voter, amount, memo)
                    // console.log("transfered", key, user, res)
                    consoleLog("Wait 3 sec...")
                    updateBypassArea(voter)
                    await timeout(delay)
                } else {
                    console.log("no broadcasting, no transfer")
                    consoleLog("no broadcasting, no transfer")
                    consoleLog("Wait 3 sec...")
                    //updateBypassArea(voter)
                    //await timeout(3000)
                }
                sent = true;
            } catch(e) {
                console.log("Err transfer")
                consoleLog(e)
            }
        }    
        if(i >= 30) {
            consoleLog("was unable to transfer after 30 tries, exiting")
            failed.push(voter.toString())
            return
        }
    }
    
    async function doTransfers(content, reward, sum_rshares, memo, broadcast, payer, key, user) {
        let sum_transfered = 0
        const pay_time = gu.getTs(content.last_payout)
        content.active_votes.sort((a,b) =>  {return b.rshares - a.rshares});
        for(let v of content.active_votes) {
            consoleLog("user " + v.voter);
            if(bypass.includes(v.voter)) {
                consoleLog("bypass transfer to " + v.voter)
                continue;
            }
            const vote_time = gu.getTs(v.time)
            if(pay_time < vote_time) {
                consoleLog(`${v.voter} проголосовал после зачисления награды. Возврат отменен.`)
                continue
            }
            const rshares = v.rshares / 1000000
            console.log("rshares = " + rshares)
            if(rshares <= 0) {
                consoleLog(v.voter + " Was no payout from this user");
                continue;
            }
            let payout = rshares * reward / sum_rshares;
            // if(payout < 0.001) {
            //     consoleLog("user's calculated payout < 0.001, increased to 0.001")
            //     payout = 0.001;
            // }
            consoleLog("user's payout " + payout);
            sum_transfered += payout;
            const amount = payout.toFixed(3) + " GBG";
            if(payout >= 0.001){
                await transfer(v.voter, amount, memo, broadcast, payer, key, user)
            } else {
                consoleLog("Bypass payout < 0.001 to user ", v.voter)
            }
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
    let msg = ``
    //e.target.disabled = true;
    var broadcast = getBroadcast()
    const node = getNode()
    golos.setWebsocket(node)
    
    let permlink = getPermlink()
    let accname = getAccname()
    let pkey = getPkey()
    let PERCENT = getPercent()
    if(!permlink || !accname || !pkey) {
        console.log("Enter valid data")
        consoleLog("Enter Valid data \n")
        lines = 1 //сброс счетчика консоли
        activateBtn(true)
        return 0
    }
    const payer_gbg = await getUserGBG(conf.payer)
    console.log("Баланс пользователя %d gbg",payer_gbg)
    consoleLog(`Баланс пользователя ${payer_gbg} gbg`)
    const content = await getContent(accname, permlink)
    if(!content){
        msg = `Не удалось получить данные о контенте. Проверьте имя аккаунта и permlink. И повторите перевод`
        consoleLog(msg)
        activateBtn(true)
        return 0
    }
    const last_payout = gu.getTs(content.last_payout)
    msg = `Время получения награды ${content.last_payout}`
    console.log(msg)
    consoleLog(msg)
    if(content.mode != 'second_payout') {
        msg = `Вы слишком рано начинаете выплаты по программе 50-50. Дождитесь зачисления награды за пост на кошелек!`
        console.log(msg)
        consoleLog(msg)
        lines = 1
        activateBtn(true)
        return 0
    }
    const infos = await collectInfos(accname, content)
    // console.log(infos)
    console.log("found reward for the post " + infos.author_reward.toFixed(3) + " GBG" )
    consoleLog(`Found reward for the post ${infos.author_reward.toFixed(3)} GBG`)
    const reward = infos.author_reward * PERCENT / 100
    console.log("reward to pay " + reward.toFixed(3) + " GBG (" + PERCENT + "%)" )
    consoleLog(`Reward to pay ${reward.toFixed(3)} GBG (${PERCENT}%) `)
    
    if(reward > payer_gbg) {
        consoleLog(`!!!!  user balance is not enough for reward payout  !!! \n`)
        lines = 1
        activateBtn(true)
        return 0
    }

    const memo = conf.memo + ` https://golos.io/${content.parent_permlink}/@${content.author}/${content.permlink}`
    consoleLog(`Memo ${memo}`)
    const sum_rshares = sumRshares(content);
    console.log("Mrshares total ", sum_rshares)
    consoleLog(`Mrshares total ${sum_rshares}`)

    if(!broadcast){
        console.log("No broadcast demo payments will be done")
        consoleLog("No broadcast! Demo payments will be done")
    }
    scanBypass()

    await doTransfers(content, reward, sum_rshares, memo, broadcast, conf.payer, pkey, accname);
    activateBtn(true)
    // e.target.disabled = false
}

const activateBtn = async function(isActive){
    document.getElementById("perform").disabled = !isActive
    document.getElementById("go-beau").disabled = !isActive
}

const run_right = async function() {
        console.log("Стремление к прекрасному")
        let msg = ``
        //e.target.disabled = true;
        var broadcast = false
        const node = getNode()
        golos.setWebsocket(node)
        let permlink = getPermlink()
        let accname = getAccname()
        let pkey = getPkey()
        let PERCENT = getPercent()
        if(!permlink || !accname) {
            console.log("Enter valid data")
            consoleLog("Enter Valid data \n")
            lines = 1 //сброс счетчика консоли
            activateBtn(true)
            return 0
        }
        const user = await golos.getAccount(accname)
        // console.log("User", parseFloat(user.vesting_shares.split(" ")[0]))
        // consoleLog(`Баланс пользователя ${payer_gbg} gbg`)
        const content = await getContent(accname, permlink)
        if(!content){
            msg = `Не удалось получить данные о контенте. Проверьте имя аккаунта и permlink.`
            consoleLog(msg)
            activateBtn(true)
            return 0
        }
        const last_payout = gu.getTs(content.last_payout)
        msg = `Время получения награды ${content.last_payout}`
        console.log(msg)
        consoleLog(msg)
        // if(content.mode != 'second_payout') {
        //     msg = `Вы слишком рано начинаете выплаты по программе 50-50. Дождитесь зачисления награды за пост на кошелек!`
        //     console.log(msg)
        //     consoleLog(msg)
        //     lines = 1
        //     // activateBtn(true)
        //     // return 0
        // }
        const infos = await collectInfos(accname, content)
        // console.log(infos)
        console.log("found reward for the post " + infos.author_reward.toFixed(3) + " GBG" )
        consoleLog(`Found reward for the post ${infos.author_reward.toFixed(3)} GBG`)
        const reward = infos.author_reward
        console.log("reward to pay " + reward.toFixed(3) + " GBG")
        consoleLog(`Reward to pay ${reward.toFixed(3)} GBG`)
        // claculate vesting_shares
        let result = []
        // await gb.calculate_beau(reward, content.active_votes, result)
        await gb.calculate_beau_sigmoida(reward, content.active_votes, result)
        for(let item of result) {
            consoleLog(`User ${item.acc} SG = ${item.gests} Reward = ${item.user_reward}`)
            await timeout(500)
        }
        activateBtn(true)
        // e.target.disabled = false
}
//-----------------------------------------------------------------------------
// Update Area
function updateBypassArea(elem) {
    var area = document.getElementsByName("exclude-text")[0]
    var text = area.value
    bypass.push(elem)
    text += (elem + '\n')
    area.value = text
}


//--------------------------------------------------------------------------
//clear button
document.getElementById("clear-button").addEventListener("click", function(e) {
    var area = document.getElementById("console")
    area.value = ""
    lines = 1
})

document.getElementById("go-beau").addEventListener("click", function(e) {
    var area = document.getElementById("console")
    area.value = ""
    lines = 1
    run_right()
})

//--------------------------------------------------------------------------
//click button
var USER, usergbg, permlink, broadcast
document.getElementById("perform").addEventListener("click", function(e) {
    activateBtn(false)
    run(e);
})

//setInterval(function(){ console.log("gbg", usergbg); }, 3000);

//console.log(golos)

//--------------------------------------------------------------------------
//Memo
function init() {
    // set memo
    document.title = `Cryprobabushka v${version}`
    consoleLog(`Cryprobabushka v${version}`)
    // console.log(conf)
    // if(conf.payer=='') conf.payer = conf.user
    document.getElementsByName("node")[0].value = conf.node
    document.getElementsByName("accname")[0].value = conf.user
    document.getElementsByName("wif")[0].value = conf.payer_key
    document.getElementsByName("memo")[0].value = conf.memo
    document.getElementsByName("memo")[0].value = conf.memo
    // set bypass
    // console.log(bypass)
    var area = document.getElementsByName("exclude-text")[0]
    console.log(area)
    text = ""
    bypass.forEach(function(element) {
        text += (element + '\n')
        area.value = text
    }, this);
}

init()