Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [
        {
            xtype: 'container',
            itemId: 'preferenceNameContainer',
            padding: '10',
            layout: {
                type: 'vbox'
            },
            flex: 1
        },
        {
            xtype: 'container',
            itemId: 'prefsGridContainer',
            padding: '10',
            height: 800,
            flex: 1
        }
    ],

    _workspaceObjectID: null,
    _workspaceRef: null,

    _typeFeature: null,
    _typeInitiative: null,

    _filterNameTextbox: null,
    _findPreferenceButton: null,
    _deletePreferenceButton: null,
    _filterSearchString: null,

    _preferencesStore: null,
    _foundPrefRecord: null,

    _preferencesGrid: null,

    launch: function() {
        var me = this;
        var currentContext = Rally.environment.getContext();

        //Get the current user and workspace
        me._user = currentContext.getUser();
        me._workspaceObjectID = currentContext.getWorkspace().ObjectID;
        me._workspaceRef = "/workspace/" + me._workspaceObjectID;

        // console.log(me._workspaceObjectID);

        this._buildUI(this);
    },

    _buildUI: function(me) {

        me._filterNameTextbox = Ext.create('Rally.ui.TextField', {
            fieldLabel: 'Preference Name:',
            width: 400
        });
        me.down('#preferenceNameContainer').add(me._filterNameTextbox);

        me._findPreferenceButton = Ext.create('Rally.ui.Button', {
            text: "Find Preference",
            handler: function() {
                me._queryFilterPref();
            }
        });
        me.down('#preferenceNameContainer').add(me._findPreferenceButton);
    },

    _queryFilterPref: function() {

        var me = this;
        me._filterSearchString = me._filterNameTextbox.getValue();

        me._preferencesStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Preference',
            autoLoad: true,
            fetch: true,
            listeners: {
                scope: this,
                load: me._preferenceStoreLoaded
            },
            filters: [
                {
                    property: 'Name',
                    operator: '=',
                    value: me._filterSearchString
                }
            ]
        });
    },

    _deletePreference: function(preferenceModel, scope) {

        var me = scope;
        preferenceModel.destroy({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {

                    // Notify of successful deletion
                    Ext.create('Rally.ui.dialog.ConfirmDialog', {
                        title: "Preference Deleted",
                        message: "Preference Successfully Removed!",
                        confirmLabel: "Ok"
                    });
                } else {
                    Ext.create('Rally.ui.dialog.ConfirmDialog', {
                        title: "Preference Not Removed",
                        message: "Error Deleting Preference!",
                        confirmLabel: "Ok",
                        listeners: {
                            confirm: function () {
                                return;
                            }
                        }
                    });
                }
            }
        });

    },

    _deletePreferenceHandler: function(record, scope) {

        var me = scope;

        var recordObjectID = record.get('ObjectID');

        var preferenceModel = Rally.data.ModelFactory.getModel({
            type: 'Preference',
            scope: this,
            success: function(model, operation) {
                model.load(recordObjectID, {
                    scope: this,
                    success: function(model, operation) {

                        var confirmLabel = "Delete Preference Permanently";
                        var message = "Really Delete Preference?";

                        Ext.create('Rally.ui.dialog.ConfirmDialog', {
                            message: message,
                            confirmLabel: confirmLabel,
                            listeners: {
                                confirm: function(){
                                    me._deletePreference(model, me);
                                }
                            }
                        });
                    }
                });
            }
        });

    },

    _viewPreferenceHandler: function(record, scope) {

        var me = scope;
        var preferenceString = record.get('Value');

        var dialogTitle = "Preference Value";
        var message = preferenceString;

        Ext.create('Rally.ui.dialog.ConfirmDialog', {
            message: preferenceString,
            dialogTitle: dialogTitle,
            confirmLabel: 'OK'
        });
    },

    _preferenceStoreLoaded: function(store, records) {

        var me = this;

        if (records.length === 0) {
            Ext.Msg.alert('Preference Not Found', me._filterSearchString);
        } else {
            me._buildPreferencesGrid(records);
        }

    },

    _buildPreferencesGrid: function(records) {

        var me = this;

        var data = [];
        Ext.Array.each(records, function(record) {

            var userName = "N/A";
            var projectName = "N/A";
            var workspaceName = "N/A";
            var valueString = "";

            var userObject = record.get('User');
            var projectObject = record.get('Project');
            var workspaceObject = record.get('Workspace');
            var appID = record.get('AppId');
            var value = record.get('Value');

            if (userObject) {
                userName = userObject._refObjectName;
            }

            if (projectObject) {
                projectName = projectObject._refObjectName;
            }

            if (workspaceObject) {
                workspaceName = workspaceObject._refObjectName;
            }

            if (value) {
                valueString = value;
            }

            data.push({
                _ref: record.get('_ref'),
                ObjectID: record.get('ObjectID'),
                AppID: appID,
                Name: record.get('Name'),
                Value: valueString,
                Workspace: workspaceName,
                Project: projectName,
                User: userName
            });
        });

        if ( me._preferencesGrid ) {
            me._preferencesGrid.destroy();
        }

        me._preferencesGrid = me.down('#prefsGridContainer').add({
            xtype: 'rallygrid',
            store: Ext.create('Rally.data.custom.Store', {
                data: data,
                pageSize: 20
            }),
            columnCfgs: [
                {
                    text: 'Name', dataIndex: 'Name', flex: 1
                },
                {
                    text: 'Preference OID', dataIndex: 'ObjectID'
                },
                {
                    text: 'App OID', dataIndex: 'AppID'
                },
                {
                    text: 'Workspace', dataIndex: 'Workspace', flex: 1
                },
                {
                    text: 'Project', dataIndex: 'Project', flex: 1
                },
                {
                    text: 'User', dataIndex: 'User', flex: 1
                },
                {
                    text: 'View Preference',
                    renderer: function (value, model, record) {
                        var id = Ext.id();
                        Ext.defer(function () {
                            Ext.widget('button', {
                                renderTo: id,
                                text: 'View',
                                width: 100,
                                handler: function () {
                                    me._viewPreferenceHandler(record, me);
                                }
                            });
                        }, 50);
                        return Ext.String.format('<div id="{0}"></div>', id);
                    }
                },
                {
                    text: 'Delete Preference',
                    renderer: function (value, model, record) {
                        var id = Ext.id();
                        Ext.defer(function () {
                            Ext.widget('button', {
                                renderTo: id,
                                text: 'Delete',
                                width: 100,
                                handler: function () {
                                    me._deletePreferenceHandler(record, me);
                                }
                            });
                        }, 50);
                        return Ext.String.format('<div id="{0}"></div>', id);
                    }
                }
            ]
        });

    }
});