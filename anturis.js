var anturis = {
    server: 'https://anturis.com',
    
    
    prefKeys: ['api', 'username', 'password', 'infrastructure'],
    prefs: {
        'username': null,
        'password': null,
        'infrastructure': 1,
    },
    
    init: function() {
        if (anturis.prefs.username && anturis.prefs.password) {
            anturis.authenticate(anturis.prefs.username, 
                anturis.prefs.password);
        }
    },
    
    request: function(method, func, data, opts) {
        $.ajax({
            url: anturis.server + func,
            dataType: 'json',
            beforeSend: function(jqXHR, settings) {
                settings.contentType = 'application/json;charset=UTF-8';
                if (method !== 'GET') {
                    settings.data = JSON.stringify(data);
                }
            },
            type: method,
            data: method === 'GET' ? data : undefined,
            crossDomain: true,
            success: opts.success,
            error: opts.error
        });
    },
    
    authenticate: function(user_name, password, opts) {
        anturis.request('GET', '/api/1/authenticate', {
            user_name: user_name
        }, {
            success: function(json, status, req) {
                anturis.request('POST', '/api/1/authenticate', {
                    user_name : user_name,
                    user_password: password
                }, {
                    success: opts.success,
                    error: opts.error
                });
            },
            error: opts.error
        });
    }
};

var ui = {
    
    front: 'div#front',
    back: 'div#back',
    
    defaultColor: '#0f0f0f',
    errorColor: 'red',
    successColor: 'LightGreen',
    
    infrastructureSelector: 'select#infrastructure',
    usernameTextBox: 'input#username',
    passwordTextBox: 'input#password',
    
    refreshLink: 'a#refresh-link',
    refreshIndicator: 'span#refresh-indicator',
    infrastructureName: 'div#infrastructure-name',
    loginIndicator: 'span#login-indicator',
    loginMessage: 'span#login-message',
    accountInfo: 'span#account-info',
    componentsList: 'table#components-list',
    
    init: function() {
        $.ajax({
            url: anturis.server + '/static/vocabulary.json',
            dataType: 'json',
            type: 'GET',
            crossDomain: true,
            success: function(json, req) {
                ui.vocabulary = json;
                console.log('loaded vocabulary');
            },
            error: function(req) {
                $(ui.accountInfo).css('color', ui.errorColor);
                $(ui.accountInfo).text('Failed to load vocabulary: ' + req.status);
            }
        });
    },
    
    saveSettings: function(settingsDict) {
        if (window.widget) {
            for(var key in settingsDict){
                tempObj = document.getElementById(key);
                widget.setPreferenceForKey(tempObj.checked, key);
            }
        } else {
            console.log('failed to save settings');
        }
    },

    loadSettings: function(keys) {
        var prefs = {}
        if (window.widget) {
            for(var key in keys) {
                if (!(widget.preferenceForKey(key) === undefined)) {
                    prefs[key] = widget.preferenceForKey(key);
                }
            }
        } else {
            console.log('failed to load settings');
        }
        return prefs;
    },
    
    getSettings: function() {
        var username = $(ui.usernameTextBox).val();
        var password = $(ui.passwordTextBox).val();
        var infrastructure = $(ui.infrastructureSelector).val();
        return {
            username: username,
            password: password,
            infrastructure: infrastructure
        }
    },
    
    setSettings: function(prefs) {
        if (prefs.username) {
            $(ui.usernameTextBox).val(prefs.username);
        }
        if (prefs.password) {
            $(ui.passwordTextBox).val(prefs.password);
        }
        if (prefs.infrastructure) {
            $(ui.infrastructureSelector).val(prefs.infrastructure);
        }
    },
    
    getObjStatusImg: function(obj) {
        if (obj.state === 0) {
            return 'status/stoppped.png'
        }
        switch(obj.status) {
            case ui.vocabulary.status.success.code:
                return 'status/ok.png';
                
            case ui.vocabulary.status.at_risk.code:
                return 'status/at_risk.png';
                
            case ui.vocabulary.status.warning.code:
                return 'status/warn.png';
                
            case ui.vocabulary.status.error.code:
                return 'status/error.png';
                
            case ui.vocabulary.status.no_data.code:
            default:
                return 'status/nodata.png';
        }
    },
    
    getComponentCategory: function(categoryId) {
        return ui.vocabulary.components.categories[categoryId].name['en_US'];
    },
    
    showFront: function() {
        if (ui.authenticated) {
            anturis.request('GET', '/api/1/account', {}, {
                success: function(json, req) {
                    $(ui.accountInfo).css('color', ui.defaultColor);
                    $(ui.accountInfo).text('Logged in as "' + json.accounts[0].name + '"');
                },
                error: function(req) {
                    $(ui.accountInfo).css('color', ui.errorColor);
                    $(ui.accountInfo).text('Failed to load account information: ' + req.status);
                }
            });
        }
        
        $('div.card').css('-webkit-transform', '');
        $('#info').css('display', 'block');
    },
    
    showBack: function() {
        var prefs = ui.loadSettings(anturis.prefKeys);
        ui.setSettings(prefs);
        
        $('#info').css('display', 'none');
        $('div.card').css('-webkit-transform', 'rotateY(180deg)');
    },
    
    refresh: function() {
        if (ui.authenticated) {
            $(ui.refreshIndicator).css('visibility', 'visible');
            $(ui.componentsList).css('visibility', 'hidden');
            
            //load infrastructure info
            anturis.request('GET', '/api/1/infrastructure', {
                filter: JSON.stringify({
                    property: 'id',
                    value: anturis.prefs.infrastructure
                })
            }, {
                success: function(json, req) {
                    $(ui.infrastructureName).text(json.infrastructures[0].name);
                },
                error: function(req) {
                    console.log('failed to load infrastructure #' + anturis.prefs.infrastructure
                        + ': ' + req.status);
                    ui.showBack();
                }
            });
            
            //load components
            anturis.request('GET', '/api/1/component', {
                infrastructure_id: anturis.prefs.infrastructure
            }, {
                success: function(json, req) {
                    $(ui.componentsList).empty();
                    $.each(json.components, function(idx, cmp) {
                        $(ui.componentsList).append(
                            '<tr>' +
                                '<td><img src="' + ui.getObjStatusImg(cmp) + '" /></td>' +
                                '<td width="60%">' + cmp.name + '</td>' +
                                '<td width="30%">' + ui.getComponentCategory(cmp.category_id) + '</td>' +
                            '</tr>');
                    });
                    
                    $(ui.refreshIndicator).css('visibility', 'hidden');
                    $(ui.componentsList).css('visibility', 'visible');
                    $(ui.refreshLink).css('visibility', 'visible');
                },
                error: function(req) {
                    console.log('failed to get components: ' + req.status);
                    ui.showBack();
                }
            })
        }
    },
    
    onSaveSettings: function(event) {
        var prefs = ui.getSettings();
        if (!prefs.username) {
            $(ui.loginMessage).css('color', ui.errorColor);
            $(ui.loginMessage).text('Username is empty');
            return;
        }
        if (!prefs.password) {
            $(ui.loginMessage).css('color', ui.errorColor);
            $(ui.loginMessage).text('Password is empty');
            return;
        }
        
        ui.saveSettings(prefs);
        anturis.prefs = prefs;
        if (!ui.authenticated) {
            ui.doLogin({
                error: function(req) {
                    $(ui.loginMessage).css('color', ui.errorColor);
                    $(ui.loginMessage).text('Failed to authenticate: ' + req.status);
                },
                success: function(json, req) {
                    //logged in
                    ui.showFront();
                    ui.refresh();
                }
            });
        }
        else {
            //already logged in
            ui.showFront();
            ui.refresh();
        }
    },
    
    doLogin: function(opts) {
        ui.authenticated = false;
        $(ui.loginIndicator).css('visibility', 'visible');
        var prefs = ui.getSettings();
        anturis.authenticate(prefs.username, prefs.password, {
            error: function(req) {
                $(ui.loginIndicator).css('visibility', 'hidden');
                opts.error(req);
            },
            success: function(json, req) {
                $(ui.loginIndicator).css('visibility', 'hidden');
                ui.authenticated = true;
                
                //update infrastructures
                anturis.request('GET', '/api/1/infrastructure', {}, {
                    success: function(json, req) {
                        $(ui.infrastructureSelector).attr('disabled', false);
                        $(ui.infrastructureSelector).empty();
                        $.each(json.infrastructures, function(idx, infr) {
                            $(ui.infrastructureSelector).append(
                                '<option value="' + infr.id + '">' + 
                                infr.name + 
                                '</option>');
                        });
                    },
                    error: function(req) {
                        $(ui.infrastructureSelector).attr('disabled', true);
                        $(ui.loginMessage).css('visibility', 'visible');
                        $(ui.loginMessage).css('color', ui.errorColor);
                        $(ui.loginMessage).text('No infrastructures: ' + req.status);
                    }
                });
                
                opts.success(json, req);
            }
        });
    },
    
    onLogin: function(event) {
        $(ui.loginMessage).css('visibility', 'hidden');
        ui.doLogin({
            error: function(req) {
                $(ui.loginMessage).css('visibility', 'visible');
                $(ui.loginMessage).css('color', ui.errorColor);
                $(ui.loginMessage).text('Failed to authenticate: ' + req.status);
            },
            success: function(json, req) {
                ui.authenticated = true;
                $(ui.loginMessage).css('visibility', 'visible');
                $(ui.loginMessage).css('color', ui.successColor);
                $(ui.loginMessage).text('Authenticated successfuly.');
            }
        });
    },
    
    onRefresh: function(event) {
        if (ui.authenticated) {
            $(ui.refreshLink).css('visibility', 'hidden');
            ui.refresh();
        }
    }
};

$(document).ready(function() {
    ui.init();
    anturis.prefs = ui.loadSettings(anturis.prefKeys);
    if (!anturis.prefs.username || !anturis.prefs.password) {
        ui.showBack();
    }
    else {
        anturis.authenticate(prefs.username, prefs.password, {
            error: function(status, req) {
                ui.showBack();
            },
            success: function(json, status, req) {
                console.log('all fine');
            }
        });
    }
});