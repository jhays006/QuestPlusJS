// Author: Jason Hays
// need some more functions to help resemble numpy

function reshape(X, shape) {
    // reorder the values into the shape if possible (must have the same product).
    X = unravel(X);
    shape = numeric.clone(shape);
    // divide up the 1D array in reverse order
    shape.reverse();
    
    // the last dimension ("first" if considering it when it isn't reversed)
    //  is determined/forced by the others.
    var i=0, l=shape.length-1;
    for (;i<l;i++) {
        // just keep packaging them into arrays based on the current dimension.
        var packaged = [], offset=shape[i];
        while (X.length) {
            // splice directly affects X, but also returns what was removed.
            // so keep splicing 0 and offset until X is empty
            packaged.push(X.splice(0,offset));
        }
        X = packaged;
    }
    return X;
}

function weibull_db(contrast, params, guess=0.5){
    // unpack params
    var threshold, slope, lapse;
    if (params.length == 3)
        threshold, slope, lapse = params
    else {
        threshold = params[0];
        slope = params[1];
        lapse = 0.0;
    }
    return (1 - lapse) - (1 - lapse - guess) * Math.exp(-1*(10.0) ** (slope * (contrast - threshold) / 20.));
}



function zeros(shape) {
    // make an array of zeros with the given shape.
    return values(shape, 0.0);
}


function group_parallel(X,Y) {
    // make a matrix like X have an additional dimension of length 1 at the end.
    // i.e., X with a shape of [2,2] becomes [2,2,1].
    var i=0, shape=numeric.dim(X);
    var l = shape.length;
    var func = "";
    var cap = "";
    var indices = "";
    for (;i<l-1;i++) {
        func = func.concat("X.forEach((function(item, index",i,"){ ");
        cap = cap.concat("}))");
        indices+="[index".concat(i,"]");
    }
    indices+="[index".concat(i,"]");
    Z = numeric.clone(X)
    func = func.concat("item.forEach((function(item, index",i,"){Z",indices," = [X",indices,", Y",indices,"]; }))", cap);
    eval(func);
    return Z;
}

function unravel(X) {
    return eval("["+String(X)+"]")
}


function argmax(X) {
    var idx = 0;
    X = unravel(X);
    var max = X[0];
    X.forEach((function(item, index){ if (max < item) {max = item; idx = index}}));
    return idx;
}


function argmin(X) {
    var idx = 0;
    X = unravel(X);
    var min = X[0];
    X.forEach((function(item, index){ if (min > item) {min = item; idx = index}}));

    return idx;
}

function values(shape, value) {
    var s = String(value), i=0, l;
    if (Array.isArray(shape))
        l = shape.length;
    else {
        l = 1;
        shape = [shape];
    }
    shape =numeric.clone(shape);
    shape.reverse();
    for (;i<l;i++){
        s+=",";
        s = "["+s.repeat(shape[i])+"]";
    }
    return eval(s);
}

function nansum(X) {
    var sum = 0.0;
    X.forEach((function(X,idx){if (!isNaN(X)) sum += X}));
    return sum;
}



function arange(start,end,step=null) {
    if (step === null)
        step = 1;
    var arr = [];
    if (end > start) {
        for (var i=start; i < end; i+=step) {
            arr.push(i);
        }
    } else {
        for (var i=start; i > end; i+=step) {
            arr.push(i);
        }
    }
    return arr;
}

function arange_round(start,end,step=null) {
    if (step === null)
        step = 1;
    var arr = [];
    if (end > start) {
        for (var i=start; Math.round(i*10)/10 < end; i+=step) {
            arr.push(Math.round(i*10)/10);
        }
    } else {
        for (var i=start; Math.round(i*10)/10 > end; i+=step) {
            arr.push(Math.round(i*10)/10);
        }
    }
    return arr;
}


//https://stackoverflow.com/questions/5259421/cumulative-distribution-function-in-javascript
function normal(x, mean, std) {
  var x = (x - mean) / std
  var t = 1 / (1 + .2315419 * Math.abs(x))
  var d =.3989423 * Math.exp( -x * x / 2)
  var prob = d * t * (.3193815 + t * ( -.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if( x > 0 ) prob = 1 - prob
  return prob
}
// tau is the sensitivity threshold
function sensitivity_function(s, tau, gamma, beta=5){
    return (beta*((s/tau)**gamma))/Math.sqrt(((beta**2)-1)+(s/tau)**(2*gamma));
}
var sqrt2 = Math.sqrt(2);
function psych_function(s_diff, params){
    var dp_diff = Math.sign(s_diff)*sensitivity_function(Math.abs(s_diff), tau=params[0], gamma=params[1]);
    return 1-normal((params[2]-dp_diff)/sqrt2,0,1);
}
// threshold is parameter 0 in params
function yes_no_psych_function(s_diff, params){
    var dp = Math.sign(s_diff)*sensitivity_function(Math.abs(s_diff), tau=params[0], gamma=params[1]);
    return 1 - normal(params[2] - dp, 0, 1);
}