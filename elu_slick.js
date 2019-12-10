(function ($) {
    
    (function(){

        $.blockUI.defaults.message = null
        $.blockUI.defaults.overlayCSS.opacity = 0.8
        $.blockUI.defaults.overlayCSS.backgroundColor = '#fff'

        let _do_apologize = $_DO.apologize
        $_DO.apologize = function (o, fail) {
            $('.blockUI').remove ()
            _do_apologize (o, fail)
        }

    })();
    
    $.extend (true, window, {
		Slick: {
		
			Formatters: {
			
		        "DDMMYYYY": function CheckmarkFormatter (row, cell, value, columnDef, dataContext) {
		        	if (value == null || value.length < 10) return ''
		        	value = value.slice (0, 10)
		        	if (value.charAt (2) == '.') return value
		        	return value.split ('-').reverse ().join ('.')
		        },
		        
			}
						
		}
		
    })
    
    $.fn.on_change = function (todo) {
    	let p = this.parents ()
    	let a = p [p.length - 1]
    	todo.call (a, or_null (this.val ()))
    	this.on ('change', function () {todo.call (a, or_null (this.value))})
    }

    $.fn.valid_data = function () {
	    return values (this).actual ().validated ()
    }
    
    $.fn.draw_popup = function (o = {}) {

    	let buttons = o.buttons || []

		$('>button', this).each (function () {

			let $this = $(this)

			if ($this.css ('display') == 'none') return

			let b = {text: $this.text (), attr: {}}

			for (let i of $._data (this, 'events').click) b.click = i.handler					

			for (let a of this.attributes) {

				let k = a.name; if (k == 'style') continue
				let v = a.value
				
				switch (k) {
					case 'name':
						b.name = v
						break
					default: 
						b.attr [k] = v
				}
				
			}

			buttons.push (b)
			
			$(this).remove ()
		
		})
		
		o.buttons = buttons

    	if (!('modal' in o)) o.modal = true
    	for (let k of ['width', 'height']) if (!(k in o)) o [k] = this.attr (k)
    	    	
    	let d = this.dialog (o).on ('dialogclose', (e) => {$('.ui-dialog').remove (); blockEvent (e)})
    
    	return d

    }

    $.fn.draw_form = function (data) {

    	let _fields = data._fields; if (_fields) for (let _field of Object.values (_fields)) {

    		let v = data [_field.name]
    		
    		if (v instanceof Date) v = v.toJSON ()

    		if (v == null) v = ''; else v = '' + v
    	
    		switch (_field.TYPE_NAME) {
    			case 'DATE':
    				if (v.length > 10) v = v.slice (0, 10)
    			break
    		}
    		
    		data [_field.name] = v

    	}

        var $view = fill (this, data)
        
        let is_edit = (name) => {switch (name) {
            case 'update':
            case 'cancel':
                return true
            default:
                return false
        }}

        let is_visible = (name, is_ro) => {

            if (name == 'undelete') return data.is_deleted == 1

            if (data.is_deleted == 1) return false

            return is_ro ? !is_edit (name) : is_edit (name)

        }

        let read_only = {
        
            off: () => {

                $('button', $view).each (function () {
                    if (is_visible (this.name, 0)) $(this).show (); else $(this).hide ()
                })
                
                $(':input', $view).not ('button').each (function () {
                    $(this).prop ({disabled: 0})
                })

                $('*[autofocus]:visible', $view).focus ()
                
            },
            
            on: () => {

                $('button', $view).each (function () {
                    if (is_visible (this.name, 1)) $(this).show (); else $(this).hide ()
                })
                
                $(':input', $view).not ('button').each (function () {
                    $(this).prop ({disabled: 1})
                })
                
				clickOn ($('button[name=edit]', $view), read_only.off)
			
				clickOn ($('button[name=cancel]', $view), read_only.again)

            },

            again: (e) => {

                if (!confirm ('Отменить внесённые изменения?')) return

                refill (data, $(e.target).closest ('.drw.form'))

                read_only.on ()
                
            },

        }

        if ($('button[name=edit]', $view).length * $('button[name=cancel]', $view).length > 0) read_only.on ()

        return $view
        
    }
    
    $.fn.draw_table = function (o) {    
                    
        o = Object.assign ({
            enableCellNavigation: true,
            forceFitColumns: true, 
			autoEdit: false,
		}, o)
        
        for (let c of o.columns || []) if (c.filter) o.showHeaderRow = true
        if (o.showHeaderRow) o.explicitInitialization = true

        if (!o.searchInputs) o.searchInputs = []

        if (!o.rowHeight) {
			let $row = $('<div class=slick-row style="position:fixed;z-index:1000" />').prependTo (this)
			let h = $row.height (); if (h > 0) o.rowHeight = h
			$row.remove ()
        }
        
        if (!o.headerRowHeight) {
			let $row = $('<div class=slick-headerrow style="position:fixed;z-index:1000" />').prependTo (this)
			let h = $row.height (); if (h > 0) o.headerRowHeight = h
			$row.remove ()
        }

        if (this.height () == 0 && Array.isArray (o.data)) o.autoHeight = true

		if (o.src) {
			let src = Array.isArray (o.src) ? o.src : [o.src]
			let [type, part] = src [0].split ('.')
			o.url = {type, part, id: null}
			if (src.length > 1) o.postData = src [1]
		}

        let loader = !o.url ? null : new Slick.Data.RemoteModel (o.url, o.postData)

        if (loader) o.data = loader.data
        
        if (!o.data.getItemMetadata) o.data.getItemMetadata = o.getItemMetadata || function (row) {
            let r = o.data [row]
            if (r == null) return 
            if (r.is_deleted == 1) return {cssClasses: 'deleted'}
        }

		let plugins = []
		let selectionModel = null

		o.columns = (o.columns || []).map (c => {	
		
			if (c.class) c = new c.class (c)
		
			if (c.constructor.name == "CheckboxSelectColumn") {
			
				plugins.push (c)
				
				selectionModel = new Slick.RowSelectionModel ({selectActiveRow: false})
			
				return c.getColumnDefinition ()
			
			}
			else {
			
				if (!c.id) c.id = c.field

				if (c.voc) c.formatter = (r, _, v) => c.voc [v]
				
				return c
            
			}
		
		}) 

        let grid = new Slick.Grid (this, o.data, o.columns, o)
        
        this.data ('grid', grid)
        
		for (let plugin of plugins) grid.registerPlugin (plugin)
		
		if (selectionModel) grid.setSelectionModel (selectionModel)        
        
        if (o.showHeaderRow) {
        
            let f = o.onHeaderRowCellRendered || ((e, a) => {            
                let filter = a.column.filter            
                if (filter) return grid.setColFilter (a, filter)
                $(a.node).text ('\xa0')            
            })
            
            o.onHeaderRowCellRendered = (e, a) => {

                f (e, a)

                if (!loader) return

                let col = a.column; if (!col.filter) return

                let $anode = $(a.node)

                $anode
                
                .mouseenter (() => {
                
	                let drop = $anode.data ('drop'); if (!drop) return

                    var s = loader.postData.search.filter (i => i.field == col.id)
                    
                    if (!s.length || s [0].value == null) return
                    
                    let $b = $('<div class=drop-filter>').appendTo ($anode).click ((e) => {
                        blockEvent (e)
                        grid.setFieldFilter ({field: col.id})
                        $b.remove ()
                        drop ()
                    })

                })
                
                .mouseleave (() => {
                    $('.drop-filter', $anode).remove ()
                })

            }
            
        }
        
        if (o.onRecordDblClick) {
        
        	o.onDblClick = (e, a) => o.onRecordDblClick (a.grid.getDataItem (a.row))
        
        }
        
        for (let i of [
            'onClick',
            'onDblClick',
            'onKeyDown',
            'onHeaderRowCellRendered',
            'onContextMenu',
            'onSelectedRowsChanged',
            'onCellChange',
        ]) {
        	let h = o [i]
        	if (h) grid [i].subscribe (h)
        }
        
        grid.refresh = () => grid.onViewportChanged.notify ()
        
        grid.reload = () => {
            loader.clear ()
            grid.setData (loader.data, true)
            grid.refresh ()
        }
        
        grid.findDataItem = (r) => {
        
        	let data = grid.getData ()

        	outer: for (let n in data) {
        	
        		if (isNaN (n)) continue

        		let v = data [n]

        		for (let k in r) {
        			let s = r [k]
        			if (typeof s == "function") continue         		
        			if (s != v [k]) continue outer
        		}
        		
        		return v
        		
        	}
        	
        	return {}

        }        
        
        if (loader) {
        
            grid.loader = loader
            
            grid.toSearch = function ($input) {
            
                function op (tag) {switch (tag) {
                    case 'INPUT': return 'contains'
                    default: return 'is'
                }}
                
                function val () {
                    let v = $input.val ()
                    if (v === '') return null
                    return v
                }
            
                return {
                    field: $input.attr ('data-field') || $input.attr ('name'), 
                    value: val (),
                    operator: $input.attr ('data-op') || op ($input.get (0).tagName),
                }
                
            }                
            
            for (let i of o.searchInputs) {
                let $i = $(i)
                let tag = $i.get (0).tagName
                if (tag == 'BUTTON') continue
                loader.setSearch (grid.toSearch ($i))
                switch (tag) {
                    case 'INPUT':
                        $i.keyup ((e) => {if (e.which == 13) grid.setFieldFilter (grid.toSearch ($i))})
                        break
                    case 'SELECT':
                        $i.selectmenu ({
                            width: true,
                            change: () => {grid.setFieldFilter (grid.toSearch ($i))}
                        })
                        break
                }
            }

            grid.setFieldFilter = (s) => {
                grid.loader.setSearch (s)
                grid.reload ()
            }
            
            grid.setColFilter = (a, filter) => {            
            	show_block ('_grid_filter_' + filter.type, {a, filter})            	            
            }

            loader.onDataLoaded.subscribe ((e, args) => {
                for (var i = args.from; i <= args.to; i ++) grid.invalidateRow (i)
                grid.updateRowCount ()
                grid.render ()
                if (grid.getOptions ().enableCellNavigation && grid.getActiveCell () == null) {
                	grid.setActiveCell (0, 0)
                	grid.focus ()
                }
                this.unblock ()
            })        
            
            grid.onViewportChanged.subscribe (function (e, args) {
                var vp = grid.getViewport ()
                loader.ensureData (vp.top, vp.bottom)
            })

            grid.onSort.subscribe (function (e, args) {
                loader.setSort (args.sortCol.field, args.sortAsc ? 1 : -1)
                grid.reload ()
            })
            
			grid.onKeyDown.subscribe (function (e, args) {
				if (e.which == 13 && !e.ctrlKey && !e.altKey && grid.getActiveCell ()) grid.onDblClick.notify (args, e, this)
			})

        }
                
        $(window).on ('resize', function (e) {grid.resizeCanvas ()})
                
        this.data ('grid', grid)
        
        if (o.explicitInitialization) grid.init ()
        
        setTimeout (() => {
        	grid.resizeCanvas ()
        	grid.refresh ()
        }, 0)

        return grid

    }

    function RemoteModel (tia, postData) {
    
        if (!postData) postData = {}
        postData.searchLogic = 'AND'
        if (!postData.search) postData.search = []
        if (!postData.limit)  postData.limit = 50 
        
        function page (n) {
            return Math.floor (n / postData.limit)
        }

        var data = {length: 0}
        var sortcol = null
        var sortdir = 1
        
        var onDataLoading = new Slick.Event ()
        var onDataLoaded  = new Slick.Event ()

        function init () {}

        function isDataLoaded (from, to) {
            for (var i = from; i <= to; i ++) if (!data [i]) return false
            return true;
        }
        
        function isPageLoaded (p) {
            let n = p * postData.limit
            return isDataLoaded (n, n)
        }

        function clear () {
            for (k in data) if (k != 'getItemMetadata') delete data [k]
            data.length = 0
        }

        function ensureData (from, to) {

            if (!(from >= 0)) from = 0

            let len = data.length
            if (to >= len) to = len - 1

            let fromPage = page (from)
            let toPage   = page (to)
            
            while (fromPage < toPage && isPageLoaded (fromPage)) fromPage ++
            while (fromPage < toPage && isPageLoaded (toPage))   toPage --

            if (fromPage == toPage && isPageLoaded (fromPage)) return

            from = postData.offset = fromPage * postData.limit
            to   = (toPage + 1) * postData.limit - 1

            setTimeout (function () {

                for (var i = fromPage; i <= toPage; i ++) data [i * postData.limit] = null

                onDataLoading.notify ({from, to});

                $.ajax (dynamicURL (tia), {
                    dataType:    'json',
                    method:      'POST',
                    processData: false,
                    contentType: 'application/json',
                    timeout:     10000,
                    data:        JSON.stringify (postData),
                    headers:     {}
                })

                .done (function (d) {

                    let c = d.content
                    
                    delete c.portion

                    let cnt = c.cnt; delete c.cnt
                    
                    let l; for (let k in c) l = c [k]; let len = l.length

                    data.length = parseInt (cnt) || len

                    for (var i = 0; i < len; i ++) {
                        var r = l [i]
                        r.index = from + i
                        data [from + i] = r
                    }

                    onDataLoaded.notify ({from, to})

                })

                .fail (function (jqXHR, e) {
                    $_DO.apologize ({jqXHR: jqXHR, error: e}, fail)
                })  

            }, 0)

        }

        function reloadData (from, to) {
            for (var i = from; i <= to; i ++) delete data [i]
            ensureData (from, to);
        }

        function setSort (field, dir) {

            if (field) {
                postData.sort = [{field: field, direction: dir > 0 ? 'asc' : 'desc'}]
            }
            else {
                delete postData.sort
            }

            clear ()

        }

        function setSearch (s) {
        
            function apply (term) {
                if (s == null) return []
                let a = postData.search.filter ((i) => i.field != s.field)
                if (s.value != null) a.push (s)
                return a
            }
        
            postData.search = apply (s)            
            clear ()
            
        }
        
        init ()

        return {

          data,
          postData,

          clear,
          isDataLoaded,
          ensureData,
          reloadData,
          setSort,
          setSearch,

          onDataLoading,
          onDataLoaded,

        }
    
    }

    $.extend (true, window, {Slick: {Data: {RemoteModel: RemoteModel}}})

})(jQuery);

(function ($) {

  function handleKeydownLRNav(e) {
    var cursorPosition = this.selectionStart;
    var textLength = this.value.length;
    if ((e.keyCode === $.ui.keyCode.LEFT && cursorPosition > 0) ||
         e.keyCode === $.ui.keyCode.RIGHT && cursorPosition < textLength-1) {
      e.stopImmediatePropagation();
    }
  }

  function handleKeydownLRNoNav(e) {
    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {	
      e.stopImmediatePropagation();	
    }	
  }

  function Input (args) {

    var $input
    var defaultValue
    
    this.init = function () {
    
	    let col = args.column
	    
	    this.field = col.field

	    let attr = Object.assign ({type: 'text'}, (col.input || {}))
	    
	    this.type = attr.type
	    
		$input = $("<input />")
			.attr (attr)
          	.appendTo (args.container)
          	.on ("keydown.nav", args.grid.getOptions ().editorCellNavOnLRKeys ? handleKeydownLRNav : handleKeydownLRNoNav)
          	.focus ()
          	.select ()
          	                    	
    }

    this.destroy = function () {
		$input.remove ()	
    }

    this.focus = function () {
		$input.focus ()
    }
    
    this.canonize = function (v) {

    	if (v == null) return ''
    	
    	switch (this.type) {
    		case 'date' : return v.slice (0, 10)
    		default     : return v
    	}
    	
    }

    this.loadValue = function (item) {    
		$input.val (defaultValue = $input [0].defaultValue = this.canonize (item [this.field])).select ()
    }

    this.serializeValue = function () {
    	let v = $input.val ()
    	if (v == '') return null
    	return v
    }

    this.applyValue = function (item, v) {
		item [this.field] = v
    }

    this.isValueChanged = function () {
		return $input.val () != defaultValue
    }

    this.validate = function () {

    	let v = args.column.validator

    	return v ? v ($input.val ()) : {valid: true, msg: null}

    }

	this.init ()
		
  }
  
  function Select (args) {

    var $input
    var defaultValue
    
    this.init = function () {
    
	    let col = args.column

	    this.field = col.field
	    	    
		$input = $("<select />").appendTo (args.container)
          	
        if (col.empty) $('<option value="" />').text (col.empty).appendTo ($input)
        if (col.voc) for (let i of col.voc.items) $('<option/>').attr ({value: i.id}).text (i.label).appendTo ($input)
        
        $input.change (() => args.grid.getEditorLock ().commitCurrentEdit ())
          	          	
    }

    this.destroy = function () {
		$input.remove ()	
    }

    this.focus = function () {
		$input.focus ()
    }
    
    this.canonize = function (v) {
    	if (v == null) return ''
		return v
    }

    this.loadValue = function (item) {    
		$input.val (defaultValue = $input [0].defaultValue = this.canonize (item [this.field])).select ()
    }

    this.serializeValue = function () {
    	let v = $input.val ()
    	if (v == '') return null
    	return v
    }

    this.applyValue = function (item, v) {
		item [this.field] = v
    }

    this.isValueChanged = function () {
		return $input.val () != defaultValue
    }

    this.validate = function () {
    	let v = args.column.validator
    	return v ? v ($input.val ()) : {valid: true, msg: null}
    }

	this.init ()
		
  }

  $.extend (true, window, {Slick: {Editors: {Input, Select}}})  

})(jQuery)

function add_vocabularies (data, o) {

    for (var name in o) {

        var raw = data [name]; if (!raw) continue

        var idx = {items: raw.filter (function (r) {var f = r.fake; return !f || parseInt (f) == 0})}; $.each (raw, function () {idx [this.id] = this.text = this.label})

        data [name] = idx

    }

}

async function draw_form (name, data) {

	return (await use.jq (name)).draw_form (data)
	
}

async function draw_popup (name, data, o) {

	return (await draw_form (name, data)).draw_popup (o)
	
}

function get_popup () {

	return $('.ui-dialog-content')
	
}

function close_popup () {

    let $this = get_popup ()

    $this.dialog ('close')

    $this.remove ()
    
}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_text = $_GET._grid_filter_checkboxes = async function (data) {

	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_text = async function (data) {

	let a = data.a
	let o = data.filter || {}
	
    let $ns = $('<input class=ui-widget>')
    
    $ns.attr ({
        'data-field': a.column.id,
        placeholder: o.title || a.column.name,
    })
    
    $ns.appendTo ($(a.node))
    
    $ns.change (() => {a.grid.setFieldFilter (a.grid.toSearch ($ns))})

    $(a.node).data ('drop', () => {$ns.val ('')})

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_checkboxes = async function (data) {

	let a = data.a
	let grid = a.grid
	let o = data.filter || {}
	if (!o.items && a.column.voc) o.items = a.column.voc.items
	
	let name = a.column.id

	let $anode = $(a.node)

	let $ns = fill ($(`                
		<span class="drw popup-form">
			<center>
				<table>
					<tr>
						<td><input class=all type=checkbox>
						<td>[ВСЕ]
					<tr data-list=items>
						<td><input data-name=id type=checkbox>
						<td data-text=label>
				</table>
			</center>
		</span>                
	`), o).attr ({title: o.title})

	$('input', $ns).change ((e) => {

		let c = e.target

		if (c.name) {
			$('input.all', $ns).prop ({checked: false})
		}
		else {
			$('input', $ns).prop ({checked: c.checked})
		}

	})

	function label (ids) {
		if (!ids || !ids.length) return '[не важно]'
		return ids.map (id => o.items.filter (it => it.id == id) [0].label)
	}                 

	let ids = null
	let loader = grid.loader
	if (loader && loader.postData && loader.postData.search) {
		for (let search of loader.postData.search) if (search.field == name) ids = search.value
	}

	$(`input`, $ns).prop ({checked: false})
	if (ids) for (let id of ids) $(`input[name=${id}]`, $ns).prop ({checked: true})

	$anode.text (label (ids)).click (() => {

		$ns.dialog ({

			modal:   true,
			close:   function () {$(this).dialog ("destroy")},
			buttons: [{text: 'Установить', click: function () {

				let ids = []

				$('input:checked', $(this)).each (function () {
					ids.push (this.name)
				})

				if (!ids.length) ids = null

				$anode.text (label (ids))

				grid.setFieldFilter ({field: name, value: ids, operator: 'in'})

				$(this).dialog ("destroy")

			}}],

		}).dialog ("widget")

	})

	$anode.data ('drop', () => {$anode.text (label (null))})

}