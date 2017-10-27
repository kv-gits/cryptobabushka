const ga = require("golos-addons")
golos = ga.golos
const golosjs = require("golos-js")
const gu = require('./golos_utils')

//-----------------------------------------------------------------------------
// get sigmoid
function getSigmoid(val, maxval){
    let part = val / maxval
    // console.log("Part = ", part, val, maxval)
    let s = 6*part
    return 1/(1+Math.pow(Math.E, -s))
}

const timeout = ms => new Promise(res => setTimeout(res, ms))

/// calculate_beau
/// results - array of objects
const calculate_beau = async function calculate_beau(rewards, active_votes, result) {
    let max_gests = 0
    for(v of active_votes){
        var gests = await gu.getUserGests(v.voter)
        var acc = await golos.getAccount(v.voter)
        if(Number(gests)>Number(max_gests)) max_gests = Number(gests)
        console.log(`Acc ${v.voter} gests ${gests} , max_gests = ${max_gests}`)
        let item = {}
        item.acc = v.voter
        item.gests = gests
        result.push(item)
    }
    const vote_num = result.length
    let average_share = rewards / vote_num
    let total_payed = 0
    let temp_total_payed = 0
    let temp_result = []
    console.log(rewards)
    while( (total_payed / rewards) * 100 < 1 ) {
        let average_share = (rewards - total_payed) / vote_num
        console.log(`Rewards = ${rewards}, average_share = ${average_share}`)
        for(let v of result) {
            let sigmoid = getSigmoid(v.gests, max_gests)
            console.log(`Sigmoid = ${sigmoid}, gests = ${v.gests}, max_gests=${max_gests}`)
            v.temp_reward = average_share * sigmoid
            temp_total_payed += v.temp_reward
        }
        if (temp_total_payed <= rewards) {
            total_payed = temp_total_payed
            temp_total_payed = 0
            for(let item of result) {
                v.user_reward = v.temp_reward
            }
        }
        console.log(`temp_total_payed = ${temp_total_payed}, total_payed = ${total_payed}`)
        await timeout(1000)
    }
    console.log(`Total pay is ${total_payed}, count pay is ${rewards}`)
}

module.exports.calculate_beau = calculate_beau

/// calculate_beau
/// results - array of objects
const calculate_beau_linear = async function calculate_beau(rewards, active_votes, result) {
    let max_gests = 0
    let total_gests = 0
    for(v of active_votes){
        var gests = await gu.getUserGests(v.voter)
        var acc = await golos.getAccount(v.voter)
        total_gests += Number(gests)
        console.log(`Acc ${v.voter} gests ${gests}`)
        let item = {}
        item.acc = v.voter
        item.gests = Number(gests)
        result.push(item)
    }
    console.log(rewards)
    for(let v of result) {
        console.log(v.gests, total_gests, rewards)
        v.user_reward = v.gests/total_gests*rewards
        console.log(v)
    }
}

module.exports.calculate_beau_linear = calculate_beau_linear

/// calculate_beau
/// results - array of objects
const calculate_beau_sigmoida = async function calculate_beau(rewards, active_votes, result) {
    let max_gests = 0
    let total_gests = 0
    for(v of active_votes){
        var gests = await gu.getUserGests(v.voter)
        var acc = await golos.getAccount(v.voter)
        total_gests += Number(gests)
        console.log(`Acc ${v.voter} gests ${gests}`)
        let item = {}
        item.acc = v.voter
        item.gests = Number(gests)
        result.push(item)
    }
    let all_share = 0
    for(let v of result) {
        console.log(v.gests, total_gests, rewards)
        v.s = getSigmoid(v.gests, total_gests)
        v.sigmo_share = (v.s * v.gests)
        all_share += (v.s * v.gests)
        v.user_reward = v.gests/total_gests*rewards
        console.log(v)
    }
    all_share += getSigmoid(total_gests, total_gests)

    console.log(rewards)
    for(let v of result) {
        console.log(v.gests, total_gests, rewards)
        v.user_reward = v.sigmo_share / all_share * rewards
        console.log(v)
    }
}

module.exports.calculate_beau_sigmoida = calculate_beau_sigmoida