/*global logger*/
/*
    Grid Filter Extension
    ========================

    @file      : GridFilterExtension.js
    @version   : 1.0.0
    @author    : JvdGraaf
    @date      : Thu, 09 Mar 2017 10:43:33 GMT
    @copyright : Appronto
    @license   : Apache2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/keys",
    "dojo/_base/event",

    "GridFilterExtension/lib/jquery-1.11.2",
    "dojo/text!GridFilterExtension/widget/template/GridFilterExtension.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoKeys, dojoEvent, _jQuery, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("GridFilterExtension.widget.GridFilterExtension", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,
        _render: true,
        _grid: null,
        _tableList: null,
        _dataList: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
              this._readOnly = true;
            }

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements 
        _setupEvents: function() {
            console.log(this.id + "._setupEvents");
            this.connect(this.closeButton, "click", dojoLang.hitch(this, function(){
                this._setStyleText(this.selectionmodel, "display:none;");
                this.inputBox.value= "";
            }));
            this.connect(this.inputboxbutton, "click", dojoLang.hitch(this, this._saveData));
            this.connect(this.inputboxbutton, "onkeyup", dojoLang.hitch(this, this._onEnterClick));
        },
        _onEnterClick: function(event) {
            if (event.keyCode == dojoKeys.ENTER) {
                this._saveData();
         	}
     	},
        ////////////////////////////////////////////////////////////
        _saveFilter: function() {
            var filters = $(this._grid + " .mx-grid-search-inputs .mx-grid-search-input");
            if (filters) {
                // Built selected options to know if there is something selected
                this._dataList = [];
                for (var i = 0; i < filters.length; i++){
                    var filter = filters[i];
                    var mxClass = this._getMxClassName(filter);
                    var field = filter.firstChild;
                    if(field.tagName === "INPUT" && field.value){
                        // flat data
                        this._dataList.push({"SearchField": mxClass, "SearchValue" : field.value});
                    } else if(field.tagName === "SELECT" && field.options[field.selectedIndex].value){
                        // Dropdown
                        this._dataList.push({"SearchField": mxClass, "SearchValue" : field.options[field.selectedIndex].value});
                    }else if(field.tagName === "DIV"){
                        // Datetime selector
                        field = $(field).find('input')[0];
                        if(field.tagName === "INPUT" && field.value){
                            // flat data
                            this._dataList.push({"SearchField": mxClass, "SearchValue" : field.value});
                        } 
                    } 
                }
                if(this._dataList.length > 0){
                    this._showDialog(true);
                }
            }
        },
        _saveData: function(){
            var myJsonString = JSON.stringify(this._dataList);
            //console.log(myJsonString);
            var filterName = this.inputBox.value;
            this.inputBox.value= "";

            if(filterName){
                mx.data.create({
                    entity: this.filterEntity,
                    callback: dojoLang.hitch(this, function (obj) {
                        obj.set(this.gridAttr, this.datagridname);
                        obj.set(this.nameAttr, filterName);
                        obj.set(this.storeAttr, myJsonString);

                        if(this.onchangemf) {
                            // Trigger OnChange MF
                            this._execMf(this.onchangemf, obj.getGuid());
                        } else {
                            // Commit the data.
                            mx.data.commit({
                                mxobj: obj,
                                callback: function() {console.debug("Object committed");},
                                error: function(e) {console.log("Error occurred attempting to commit: " + e); }
                            });
                        }

                    }),
                    error: function(e) {
                        console.log("an error occured: " + e);
                    }
                });

            }
            this._setStyleText(this.selectionmodel, "display:none;");
        },
        _getMxClassName: function(element){
            var cls = $(element).attr("class").split(" ");
            var output = null;
            for (var i = 0; i < cls.length; i++) {
                if (cls[i].indexOf("mx-name-") > -1) {
                    output = cls[i];
                    break;
                }
            }
            return output;
        },
        
        ////////////////////////////////////////////////////////////
        _selectFilter: function(){
            var xpath = '//' + this.filterEntity +"["+this.gridAttr+"='"+this.datagridname+"']";
            
            // Add additional constraint
            if(this.filterConstraint){
                var constraint = this.filterConstraint;
                if(this._contextObj){	
                    if(this.tableConstraint.indexOf('[%CurrentObject%]') >= 0 && this._contextObj) {
                        constraint = this.filterConstraint.replace(/\[%CurrentObject%\]/gi, this._contextObj.getGuid());
                    }
                }
                if(this.tableConstraint.indexOf('[%CurrentUser%]') >= 0) {
                    constraint = this.filterConstraint.replace(/\[%CurrentUser%\]/gi, mx.session.getUserId());
                }
                xpath += constraint;
            }
            
            // Retrieve the Filter Items
            mx.data.get({
                xpath : xpath,
                sort: [[this.nameAttr, "asc"]],
                callback : dojoLang.hitch(this, this._prepareList)
            }, this);
        },
        _prepareList: function(objs){
            this.selectionmodellist.innerHTML = "";
            this._tableList = [];
            // Built the list
            for (var j = 0; j < objs.length; j++) {
				var obj = objs[j];
				var params = {
						id: obj.getGuid(),
						name: obj.get(this.nameAttr),
						json: obj.get(this.storeAttr)
					};	
				this._tableList.push(params);
			}
            // Transform the list to the select list
            for (var i = 0; i < this._tableList.length; i++) {
				var item = this._tableList[i];
				var li = dojoConstruct.create("li", {'innerHTML' : item.name, 'class': "selectionlistitem mx-listview-item"});
				this.connect(li, "click", dojoLang.hitch(this, this._selectionItemClick, item.id));
				this.selectionmodellist.appendChild(li);
			}
            
            this._showDialog(false);
        },
        _showDialog: function(input){
            // Show the dialog
            if(input){
                this.dialogheader.innerHTML = this.questionText;
                this._setStyleText(this.filterinputdiv, "display:block;");
                this._setStyleText(this.filterselectiondiv, "display:none;");
                
            } else {
                this.dialogheader.innerHTML = this.selectionText;
                this._setStyleText(this.filterinputdiv, "display:none;");
                this._setStyleText(this.filterselectiondiv, "display:block;");
            }
            this._setStyleText(this.selectionmodel, "display:block;");
            var left = (window.innerWidth - this.selectionmodel.offsetWidth)  / 2;
            this._setStyleText(this.selectionmodel, "display:block; left: "+left+"px;");
            
            if(input) {
                this.inputBox.focus();
            }
        },
        _selectionItemClick: function(itemId){
            var item = this._searchTable(itemId);
            var jsonObj = $.parseJSON(item.json);
            var filters = $(this._grid + " .mx-grid-search-inputs .mx-grid-search-input");
            for(var i = 0; i < filters.length; i++){
                var filter = filters[i];
                var mxClass = this._getMxClassName(filter);
                var filterText = this._searchJSON(jsonObj, mxClass);
                if(filterText){
                    var field = filter.firstChild;
                    if(field.tagName === "INPUT"){
                        field.value = filterText;
                    } else if(field.tagName === "SELECT"){
                        // Dropdown
                        field.value = filterText;
                    }else if(field.tagName === "DIV"){
                        // Datetime selector
                        field = $(field).find('input')[0];
                        if(field.tagName === "INPUT"){
                            field.value = filterText;
                        } 
                    } 
                }
            }
            
            this._setStyleText(this.selectionmodel, "display:none;");
            var button = $(this._grid+" .mx-grid-search-controls:first .mx-grid-search-button:first")[0];
            if(button) {
                button.click();
            }
        },
        _searchTable: function(itemId){
            var output = null;
            for (var i = 0; i < this._tableList.length; i++){
                if(this._tableList[i].id === itemId){
                    output = this._tableList[i];
                    break;
                }
            }
            return output;
        },
        _searchJSON: function(jsonObj, mxClass){
            var value = null;
            for (var i=0 ; i < jsonObj.length ; i++){
                if (jsonObj[i]["SearchField"] == mxClass) {
                    value = jsonObj[i]["SearchValue"];
                    break;
                }
            }
            return value;
        },
        ////////////////////////////////////////////////////////////////////////////////////////////
		_setStyleText: function(posElem, content){
            if( typeof( posElem.style.cssText ) != 'undefined') {
                posElem.style.cssText = content;
            } else {
                posElem.setAttribute("style",content);
            }
        },
        
        ////////////////////////////////////////////////////////////
        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: dojoLang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            this._grid = ".mx-name-"+this.datagridname;
            if(this._render){
                console.log(this.id + "._updateRendering render buttons for grid: "+ this._grid);
                // Search for the datagrid
                var controls = $(this._grid+" .mx-grid-search-controls:first")[0];
                if(controls){
                    // Create and add save button to controls
                    var save = dojoConstruct.create("button", {
                        "class": "btn mx-button btn-default gridfilterbutton gridfiltersave",
                        "type": "button",
                        "innerHTML": this.saveButton
                    });
                    this.connect(save, "click", dojoLang.hitch(this, this._saveFilter));
                    $(save).appendTo(controls);

                    // Create and add selection button to controls
                    var selection = dojoConstruct.create("button", {
                        "class": "btn mx-button btn-default gridfilterbutton gridfilterselect",
                        "type": "button",
                        "innerHTML": this.selectionButton
                    });
                    this.connect(selection, "click", dojoLang.hitch(this, this._selectFilter));
                    $(selection).appendTo(controls);
                } else{
                    console.log(this.id + "._updateRendering buttons couldn't be rendered because the controls div of the datagrid wasnot found.");
                }

                // Render only 1 times
                this._render = false;
            }

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },

        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["GridFilterExtension/widget/GridFilterExtension"]);
