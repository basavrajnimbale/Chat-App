function add(value, callabck){
    return callabck(value+5, false)
}

function sub(value, callabck){
    return callabck(value-3, false)
}

function mul(value, callabck){
    return callabck(value*5, false)
}

add(5, function(addRes, err){
    if(!err){
        sub(addRes, function(subRes, err){
            if(!err){
                mul(subRes, function(mulRes, err){
                    if(!err){
                        console.log("Result: "+mulRes)
                    }
                })
            }
        })
    }
})