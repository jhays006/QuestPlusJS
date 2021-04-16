// need to remove/fix everywhere using sum_axis or argmin with axis option.
// the other default options (without axes and not approximating) are working though!
// (which is what you need for the online experiment!)

// ""...Array" in javascript is the same as *args in Python.
function recur(params, ...group) {
    if (params.length == 0) {
        return [group];
    }
    var l = params[0].length;
    var groups = [];
    for (var x=0; x < l; x++) {
        groups.push(...recur(params.slice(1), ...group, params[0][x]));
    }
    return groups;
}

function reformat_params(params){
    //'''Get every combination of parameters'''
    return recur(params)
}


var log = Math.log;
// much more efficient than using numeric as I was
function mulPosteriorLikelihood(post,like) {
    return like.map((function(X0){ return X0.map((function(X1, i1){return [X1[0]*post[i1], X1[1]*post[i1]]}))}));
}

function mul_log(arr) {
    return arr.map((function(X0){return X0.map((function(X1){return X1.map((function(X2){return X2*Math.log(X2)}))}))}));
}

class QuestPlus {
    constructor(stim, params, func) {
        this.function = func;
        this.stim_domain = stim;
        this.param_domain = reformat_params(params);

        this._orig_params = numeric.clone(params);
        this._orig_param_shape = numeric.dim(params);
        this._orig_stim_shape = numeric.dim(params);

        var n_stim = this.stim_domain.length, n_param = this.param_domain.length;

        // setup likelihoods for all combinations
        // of stimulus and model parameter domains
        //this.likelihoods = zeros([n_stim, n_param, 2]);
        
        var results = []
        for (var p = 0.0; p<n_param; p++){
            var tmp = this.param_domain[p];
            var res = this.stim_domain.map((function(stimulus){ return func(stimulus, tmp)}));
            results.push(res);
        }
        results = numeric.transpose(results);
        var results2 = numeric.sub(1.0, results);
        // [n_stim, n_param, 2]
        this.likelihoods = group_parallel(results, results2);

        // we also assume a flat prior (so we init posterior to flat too)
        this.posterior = values(n_param, 1.0/n_param);
        //this.posterior = arithmeticXV(this.posterior, "/", this.posterior.sum());

        this.stim_history = [];
        this.resp_history = [];
        this.entropy = values(n_stim,1.0);
    }
    update(contrast_idx, ifcorrect){
        /*'''Update posterior probability with outcome of current trial.

        contrast - contrast value for the given trial
        ifcorrect   - whether response was correct or not
                      1 - correct, 0 - incorrect
        '''*/

        // turn ifcorrect to response index
        var resp_idx = 1 - ifcorrect;
        
        // take likelihood of such resp for whole model parameter domain
        var likelihood = numeric.transpose(this.likelihoods[contrast_idx])[resp_idx];
        numeric.muleq(this.posterior,likelihood);
        numeric.diveq(this.posterior, numeric.sum(this.posterior));
        
        // log history of contrasts and responses
        this.stim_history.push(this.stim_domain[contrast_idx]);
        this.resp_history.push(ifcorrect);
    }

    next_contrast(){
        /*'''Get contrast value minimizing entropy of the posterior
        distribution.

        Expected entropy is updated in this.entropy.

        Returns
        -------
        contrast : contrast value for the next trial.'''*/
        // full posterior needs to be i.e., shape [stims, parameter combinations, 2]
        //  and posterior is assumed flat
        var unormed_full_posterior;//mulPosteriorLikelihood(this.posterior, this.likelihoods);
        //var full_posterior = [];
        //var log_full = [];
        //var norm = [];
        var summed0 = 0;
        var summed1 = 0;
        var nansummed0 = 0;
        var nansummed1 = 0;
        // nansum is negated already while making it, so no H
        //var nansums = [];
        var entropy;
        var min_idx = 0, min = 9999;
        // use as few loops as possible to get the arrays
        // we need
        var posterior = this.posterior;
        var a,b;
        
        this.likelihoods.forEach((function(X0,i0){
            summed0=0; 
            summed1=0;
            nansummed0 = 0;
            nansummed1 = 0;
            //full_posterior.push([]); 
            unormed_full_posterior = [];
            //log_full.push([]);
            // the sums need to be obtained ahead of time
            // to normalize (+1 loop) 
            X0.forEach(function(X1,i1){
                a = posterior[i1]*X1[0];
                b = posterior[i1]*X1[1];
                summed0 += a; 
                summed1 += b;
                unormed_full_posterior.push([a,b]);
            });
            // get the log * normed, the sums needed to norm, the normed,
            //  and the nansums of the log products
            unormed_full_posterior.forEach((function(X1){
                var tmp0 = X1[0]/summed0, tmp1 = X1[1]/summed1; 
                //var ltmp0 = null, ltmp1 = null;
                if (tmp0 > 0){
                    var ltmp0 = tmp0*log(tmp0)
                    nansummed0 += ltmp0;
                }
                if (tmp1 > 0){
                    var ltmp1 = tmp1*log(tmp1);
                    nansummed1 += ltmp1;
                }
                
                /*if (!isNaN(ltmp0)) 
                    nansummed0 += ltmp0;
                if (!isNaN(ltmp1))
                    nansummed1 += ltmp1;*/
                //log_full[i0].push([ltmp0, ltmp1]);
                //full_posterior[i0].push([tmp0, tmp1]);
            }));
            // store the nansums of each column
            //nansums.push([-nansummed0, -nansummed1]); 
            // store the values used to norm each column
            //norm.push([summed0, summed1]);
            entropy = -nansummed0*summed0 -nansummed1*summed1;
            if (entropy < min) {
                min = entropy;
                min_idx = i0;
            }
            
            //entropy.push(entropy)
        }));
        
        // get the entropy
        //this.entropy = norm.map(function(X, idx){return nansums[idx][0]*X[0]+nansums[idx][1]*X[1]});
        //this.entropy = entropy;

        // choose contrast idx with minimal entropy
        //return argmin(this.entropy);
        return min_idx;
    }

    get_posterior() {
    	return reshape(this.posterior, this._orig_param_shape);
    }
    get_fit_params(){
        return this.param_domain[argmax(this.posterior)];
    }
}