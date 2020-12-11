prefix = 'global';
horizon = 4;
alpha_start = 5;
all_scores = [];
all_scores_f = [];
skip_length = 7;
saved_days = 0;
start_day = 50;

% data_4 = data_4_orig;
% data_4_orig = data_4;
% data_4 = zeros(size(data_4, 1), floor(size(data_4, 2)/7), 1);
%
% for jj=1:size(data_4, 2)
%     data_4(:, jj) = mean(data_4_orig(:, 1+(jj-1)*7 : jj*7), 2);
% end

%%

for daynum = start_day:skip_length:floor(size(data_4, 2))
    display(['Until ' num2str(daynum)]);
    fname = [prefix '_hyperparam_ref_' num2str(daynum)];
    
    T_tr = daynum; % Choose reference day here
    T_ad = 0; % Ignore this
    T_trad = T_tr + T_ad;
    inf_thres = -1;
    cidx = (data_4(:, T_trad) > inf_thres);
    k_array = (1:14);
    jp_array = (1:14);
    ff_array = (0.1:0.1:1);
    
    if daynum <= saved_days
        load(fname);
    else
        
        data_4_s = data_4(cidx, 1:T_trad+horizon);
        % Grid search
        RMSEval_no = zeros(length(k_array), length(jp_array), length(ff_array), sum(cidx));
        MAPEval_no = zeros(length(k_array), length(jp_array), length(ff_array), sum(cidx));
        
        for k=1:length(k_array)
            for jp=1:ceil(length(jp_array)/k)
                for alpha_i = alpha_start:length(ff_array)
                    alpha = ff_array(alpha_i);
                    
                    F_notravel = passengerFlow(cidx, cidx)*0;
                    F_travel = passengerFlow(cidx, cidx);
                    
                    beta_notravel = var_ind_beta(data_4_s(:, 1:T_tr), F_notravel, ones(sum(cidx), 1)*alpha, ones(sum(cidx), 1)*k, T_tr, popu(cidx), ones(sum(cidx), 1)*jp);
                    infec_notravel = var_simulate_pred(data_4_s(:, 1:T_tr), F_notravel, beta_notravel, popu(cidx), ones(sum(cidx), 1)*k, horizon, ones(sum(cidx), 1)*jp);
                    
                    RMSEvec = sqrt(mean((infec_notravel - data_4_s(:, end-horizon+1:end)).^2, 2));
                    RMSEval_no(k, jp, alpha_i, :) = (RMSEvec);
                    MAPEvec = mean(abs(infec_notravel - data_4_s(:, end-horizon+1:end))./data_4_s(:, end-horizon+1:end), 2);
                    MAPEval_no(k, jp, alpha_i, :) = (MAPEvec);
                end
            end
            fprintf('.');
        end
        fprintf('\n');
        
        
        % Identify best params per country at reference day
        best_param_list_no = zeros(length(popu), 5);
        
        for cid = 1:length(popu)
            thistable_no = [];
            thistable_yes = [];
            for k=1:length(k_array)
                for jp=1:ceil(length(jp_array)/k)
                    for alpha_i = alpha_start:length(ff_array)
                        thistable_no = [thistable_no; [k jp alpha_i MAPEval_no(k, jp, alpha_i, cid) RMSEval_no(k, jp, alpha_i, cid)]];
                    end
                end
            end
            thistable_no = sortrows(thistable_no, 5);
            best_param_list_no(cid, :) = thistable_no(1, :);
        end
        
        
        % Identify single best params at reference day
        MAPEtable_notravel_fixed = [];
        inf_thres = 10;
        inf_uthres = 100000000000;
        cidx = (data_4(:, T_tr) > inf_thres & data_4(:, T_tr) < inf_uthres);
        
        for k=1:length(k_array)
            for jp=1:ceil(length(jp_array)/k)
                for alpha_i = alpha_start:length(ff_array)
                    MAPEtable_notravel_fixed = [MAPEtable_notravel_fixed; [k jp alpha_i nanmean(MAPEval_no(k, jp, alpha_i, cidx)) nanmean(RMSEval_no(k, jp, alpha_i, cidx))]];
                end
            end
        end
        
        MAPEtable_notravel_fixed_s = sortrows(MAPEtable_notravel_fixed, 5);
        
        
        save(fname, 'MAPEtable*', 'best_param*');
    end
    
    % Compute scores
    
    beta_notravel = var_ind_beta(data_4(:, 1:T_tr+horizon), passengerFlow*0, best_param_list_no(:, 3)*0.1, best_param_list_no(:, 1), T_tr, popu, best_param_list_no(:, 2));
    
    alpha_l = MAPEtable_notravel_fixed_s(1, 3)*0.1*ones(length(popu), 1);
    k_l = MAPEtable_notravel_fixed_s(1, 1)*ones(length(popu), 1);
    jp_l = MAPEtable_notravel_fixed_s(1, 2)*ones(length(popu), 1);
    beta_notravel_f = var_ind_beta(data_4(:, 1:T_tr+horizon), passengerFlow*0, alpha_l, k_l, T_tr, popu, jp_l);
    
    thisscore = zeros(length(popu), 1);
    thisscore_f = zeros(length(popu), 1);
    for cidx=1:length(popu)
        k = best_param_list_no(cidx, 1);
        J = best_param_list_no(cidx, 2);
        new = J*beta_notravel{cidx};
        new = new(1:k);
        
        J = MAPEtable_notravel_fixed_s(1, 2);
        k = MAPEtable_notravel_fixed_s(1, 1);
        new_f = J*beta_notravel_f{cidx};
        new_f = new_f(1:k);
        
        thisscore(cidx) = sum(new);
        thisscore_f(cidx) = sum(new_f);
        
    end
    all_scores = [all_scores thisscore];
    all_scores_f = [all_scores_f thisscore_f];
end

disp('DONE!');
%%
    %start_day = 50;
    datecols = datestr(datetime(2020, 1, 21)+caldays(start_day:skip_length:floor(size(data_4, 2))), 'yyyy-mm-dd');
    datecols = cellstr(datecols);
    allcols = [{'id'; 'Country'}; datecols];
    vectorarray  = num2cell(0.5*(all_scores+all_scores_f),1);
    cidx = (0:length(countries)-1)';
    tt = table(cidx, countries, vectorarray{:}, 'VariableNames',allcols);
    vectorarray  = num2cell(data_4(:, start_day:skip_length:floor(size(data_4, 2))),1);
    tt1 = table(cidx, countries, vectorarray{:}, 'VariableNames',allcols);
    
    writetable(tt, [prefix '_scores.csv']);
    writetable(tt1, [prefix '_scores_conf.csv']);
    