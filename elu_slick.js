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
    	this.each (function () {
    		let $this = $(this)
			let p = $this.parents ()
			let a = p [p.length - 1]
			todo.call (a, or_null ($this.val ()))
			$this.on ('change', function () {todo.call (a, or_null (this.value))})
    	})
    }

    $.fn.valid_data = function () {
	    return values (this).actual ().validated ()
    }
    
    $.fn.draw_popup = function (o = {}) {

    	if (this.is ('[noresize]')) o.resizable = false

    	let buttons = o.buttons || []

		$('>button', this).each (function () {

			let $this = $(this)

			if ($this.css ('display') == 'none') return

			let b = {text: $this.text (), attr: {}}
			
			let events = $._data (this, 'events')
			
			if (events) {
				for (let i of events.click) b.click = i.handler
			}
			else {
				darn (['No event handler is set for this button', this])
			}

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

    	if (!('closeText' in o)) o.closeText = null
    	
    	for (let k of ['width', 'height']) if (!(k in o)) o [k] = this.attr (k)
    	    	
        let d = this.dialog (o).on ('dialogclose', (e) => {$(this).closest('.ui-dialog').remove (); blockEvent (e)})

    	$('.ui-dialog-titlebar button', d.parent ()).attr ({tabindex: -1})
    
    	return d

    }

    $.fn.draw_form = function (data, options = {}) {
    
		const { is_confirm_unload = 0 } = options;

    	let _fields = data._fields; if (_fields) for (let _field of Object.values (_fields)) {

    		let v = data [_field.name]
    		
    		if (v instanceof Date) v = v.toJSON ()

    		if (v == null) v = ''; else if (!Array.isArray (v)) v = '' + v
    	
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

        let confirm_unload = {

          off: () => {

            $_SESSION.delete ('is_confirm_unload')
            $(window).off('beforeunload')

          },

          on: () => {

            let inputsChanged = false
            $('input, select, textarea', $view).on('change', () => {
              if (!inputsChanged) {
                $_SESSION.set ('is_confirm_unload', 1)
                inputsChanged = true
              }
            })

            $(window).bind("beforeunload", function(e) {
              if (inputsChanged) {
                e.preventDefault()
                e.returnValue = ''
                return ''
              }
            })

          }

        }

        let read_only = {
        
            off: () => {

                if (is_confirm_unload) confirm_unload.on()

                $('button', $view).each (function () {
                    if (is_visible (this.name, 0)) $(this).show (); else $(this).hide ()
                })
                
                $(':input', $view).not ('button').each (function () {
                    $(this).prop ({disabled: 0})
                })

                $('*[autofocus]:visible', $view).focus ()
                
            },
            
            on: () => {

                if (is_confirm_unload) confirm_unload.off()

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
        	enableTextSelectionOnCells: true,
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
        
        let max_col_rows = 1; for (let column of o.columns) {

        	if (!column.rows) column.rows = 1

        	if (column.rows == 1) continue

        	column.cssClass = ((column.cssClass || '') + ' wrap').trim ()

        	if (max_col_rows < column.rows) max_col_rows = column.rows

        }

        o.rowHeight *= max_col_rows

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
		
		if (!o.sort) {
		
			let sort = $_SESSION.delete ('_grid_sort'); if (sort) o.sort = sort

		}

		if (!o.search) {
		
			let search = $_SESSION.delete ('_grid_serach') || $_SESSION.delete ('_grid_search'); if (search) o.search = search

		}

		if (o.url) {
		
			if (!o.postData) o.postData = {}

			let {search, sort} = o; 
			
			if (search && search.length) {			
			
				let ids = {}; for (let i of search) ids [i.field] = 1
				
				o.postData.search = [
				
					...(o.postData.search || []).filter (i => !ids [i.field]), 
					
					...search
				
				]

			}

			if (sort && sort.length) o.postData.sort = sort

		}

        let loader = !o.url ? null : new Slick.Data.RemoteModel (o.url, o.postData)

        if (loader) o.data = loader.data
        
        if (!o.data.getItemMetadata) o.data.getItemMetadata = o.getItemMetadata || function (row) {
            let r = o.data [row]
            if (r == null) return 
            let classes = r.classes || ''
            if (r.is_deleted == 1) classes = classes + ' deleted'
            if (classes) return {cssClasses: classes}
        }

		let plugins = []
		let selectionModel = null

		o.columns = (o.columns || []).map (c => {	
		
			if (c.class) c = new c.class (c)
		
			if (c.constructor.name == "CheckboxSelectColumn") {
			
				plugins.push (c)
				
				selectionModel = new Slick.RowSelectionModel ({selectActiveRow: o.selectActiveRow || false})
			
				return c.getColumnDefinition ()
			
			}
			else {
			
				if (!c.id) c.id = c.field

				if (c.voc && !c.formatter) c.formatter = (r, _, v) => Array.isArray (v) ? v.map (vv => c.voc [vv]).join (', ') : c.voc [v]
				
				return c
            
			}
		
		}) 

        if (o.max_height) o.autoHeight = true
        
        o.all_columns = o.columns
        
        o.columns = o.all_columns.filter (i => !i.hidden)

    	let grid = new Slick.Grid (this, o.data, o.columns, o)
    	
    	let {sort} = o; if (sort) grid.setSortColumns (sort.map (i => ({
    		columnId : i.field, 
    		sortAsc  : i.direction != 'desc'
    	})))

		grid.onColumnsChanged = new Slick.Event ()

		grid.notifyColumnsChanged = () => {

			let {all_columns} = grid.getOptions (), idx = {}

			for (let c of all_columns) {

				c.hidden = 1

				idx [c.id] = c

			}

			for (let c of grid.getColumns ()) {

				let ac = idx [c.id]

				ac.hidden = 0

				ac.width = c.width

			}
			
			let last = '', before = {'' : []}

			for (let c of all_columns) {
			
				if (c.hidden) {
				
					if (!before [last]) before [last] = []
					
					before [last].push (c.id)
				
				}
				else {
				
					last = c.id
				
				}

			}
			
			let columns = before [''].map (id => idx [id])
			
			for (let c of grid.getColumns ()) {

				let b = before [c.id]
				
				if (b) for (let id of b) columns.push (idx [id])
				
				columns.push (c)

			}

			let a = {

				columns: columns.map (c => ({
					id: c.id, 
					width: c.width,
					hidden: c.hidden,
				}))

			}

			let {loader} = grid; if (loader) {

				let {postData} = loader; if (postData) for (let k in postData) switch (k) {

					case 'search':
					case 'sort':
						a [k] = postData [k]

				}

			}

			grid.onColumnsChanged.notify (a, new Slick.EventData (), grid)

		}

		for (let e of ['onColumnsResized', 'onColumnsReordered']) grid [e].subscribe (grid.notifyColumnsChanged)

        this.data ('grid', grid)
        
		for (let plugin of plugins) grid.registerPlugin (plugin)
		
		if (selectionModel) grid.setSelectionModel (selectionModel)        
        
        if (o.showHeaderRow) {
        
            let f = o.onHeaderRowCellRendered || ((e, a) => {            
                let column = a.column
                let filter = column.filter                
                if (!filter) return $(a.node).text ('\xa0')
                if (!('title' in filter)) filter.title = column.name
                grid.setColFilter (a, filter)
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
        
        	o.onDblClick = (e, a) => o.onRecordDblClick (a.grid.getDataItem (a.row), a.grid.getColumns()[a.cell])
        
        }
        
        if (o.onCellChange) {
        
        	let todo = o.onCellChange
        	
        	o.onCellChange = async (e, a) => {
        
				let defaultValue = grid.getCellEditor ().defaultValue

				let field = grid.getColumns () [a.cell].field

				try {
					await todo (e, a)
				}
				catch (x) {
					Slick.GlobalEditorLock.cancelCurrentEdit ()
					grid.getData () [a.row] [field] = defaultValue
					grid.invalidateRow (a.row)
					grid.render ()
				}

			}
        
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

        grid.triggerColumn = (id, visible) => {
        
        	let {all_columns} = grid.getOptions ()
        
        	for (let c of all_columns) if (c.id == id) c.hidden = visible ? 0 : 1

			grid.setColumns (all_columns.filter (c => !c.hidden))

			grid.notifyColumnsChanged ()

        }
        
		grid.draw_popup = async function (name, data, o = {}) {

			let $view = await draw_popup (name, data, o)

			$view.data ('grid', grid)

			return $view

		}

        grid.reload = () => {
            $_SESSION.set ('reload_' + grid.getContainerNode().id, true)
            loader.clear ()
            grid.setData (loader.data, true)
            grid.refresh ()
        }
                
        grid.moveDataFrom = (grid_from, o = {}) => {

			let src = clone (grid_from.getData ())
			let dst = clone (grid.getData ())

			for (let row of clone (o.rows || []).sort ((a, b) => b - a)) dst.push (src.splice (row, 1) [0])

			if (!o.sort) for (let column of grid.getColumns ()) {
				if (column.id == "_checkbox_selector") continue
				let field = column.field
				if (!field) continue
				o.sort = field
				break
			}
			
			if (typeof o.sort != 'function') {

				let k = o.sort, f = r => r [k]
				
				o.sort = (a, b) => {
					let fa = f (a), fb = f (b)
					return fa > fb ? 1 : fa < fb ? -1 : 0
				}

			}

			grid_from.setData (src)
			grid.setData (dst.sort (o.sort))
			
			for (let g of [grid_from, grid]) {
				g.setSelectedRows ([])
				g.render ()
			}

        }
        
        grid.moveDataTo = (grid_to, o = {}) => {
        	grid_to.moveDataFrom (grid, o)
        }
        
        grid.moveSelectedDataTo = (grid_to, o = {}) => {
        	grid_to.moveDataFrom (grid, Object.assign (o, {rows: grid.getSelectedRows ()}))
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
        
        grid.setColFilter = (a, filter) => {
        
        	let data = {a, filter}
        
        	let {loader} = a.grid; if (loader) {
        	
        		let [term] = loader.postData.search.filter (i => i.field == a.column.id)
        		
        		if (term) data.value = term.value
        	
        	}

        	show_block ('_grid_filter_' + filter.type, data)

        }

        grid.toSearch = function ($input) {

            function op () {

                let tag  = $input.get (0).tagName
                let type = $input.attr ('filter-type') || $input.attr ('type')

                if (tag == 'INPUT' && type == 'checkbox') return 'in'

                if (tag == 'INPUT' && type != 'date') return 'contains'

                return 'is'
            }

            function val () {
                let v = $input.val ()
                if (v === '') return null

                let type = $input.attr ('filter-type') || $input.attr ('type')

                if (type == 'date')
                    v = v.split(".").reverse().join("-")

                if (type == 'checkbox') {
                    const $cbxGroup = $input.closest('.cbx-group')
                    if ($cbxGroup.length) {
                        v = []
                        const $cbxGroupItems = $cbxGroup.find('input[type="checkbox"]')
                        const isTrigger = +$cbxGroup.attr('is_trigger')
                        if (isTrigger) {
                            $cbxGroupItems.not($input).prop('checked', false)
                        }
                        $cbxGroupItems.each((i, cbx) => {
                            if ($(cbx).is(':checked')) {
                                v = [...v, $(cbx).val()]
                            }
                        })
                    } else {
                        v = $input.is(":checked") ? [1] : null
                    }
                }

                return v
            }

            return {
                field: $input.attr ('data-field') || $input.attr ('name'),
                value: val (),
                operator: $input.attr ('data-op') || op (),
            }

        }
        
        if (loader) {
        
            grid.each = loader.each
        
            grid.loader = loader
            
            let search = loader.postData.search || []
            
            for (let i of o.searchInputs) {
            
                let $i = $(i), tag = $i.get (0).tagName; if (tag == 'BUTTON') continue
                
                let name = $i.attr ('name'), [term] = search.filter (i => i.field == name)
                
                if (term) {
                
                	$i.val (term.value)
                
                }
                else {
                
	                loader.setSearch (grid.toSearch ($i))
                
                }
                
                switch (tag) {
                
                    case 'INPUT':
                    
                        $i.keyup ((e) => {if (e.which == 13) grid.setFieldFilter (grid.toSearch ($i))})
                        
                        if (['date', 'checkbox'].includes($i.attr ('type')))
                            $i.change ((e) => {
                                grid.setFieldFilter (grid.toSearch ($(e).length ? $(e.target) : $i))
                            })

                        break
                        
                    case 'SELECT':
                    
                    	if ($i.select2) {

							$i.select2 ({
								dropdownAutoWidth : true,
							}).on ('change', function () {grid.setFieldFilter (grid.toSearch ($i))})

                    	}
                    	else {

							$i.selectmenu ({
								width: true,
								change: () => {grid.setFieldFilter (grid.toSearch ($i))}
							})                        

                    	}

                        break

                }
            }

            grid.setFieldFilter = (s) => {
                grid.loader.setSearch (s)
                grid.notifyColumnsChanged ()
                grid.reload ()
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
				let is_reload = $_SESSION.delete ('reload_' + grid.getContainerNode().id)
				if (is_reload && grid.getOptions().max_height && isNaN(vp.bottom)) vp.bottom = 1
                loader.ensureData (vp.top, vp.bottom)
            })

            grid.onSort.subscribe (function (e, args) {
                loader.setSort (args.sortCol.field, args.sortAsc ? 1 : -1)
                grid.notifyColumnsChanged ()
                grid.reload ()
            })
            
			grid.onKeyDown.subscribe (function (e, args) {
				if (e.which == 13 && !e.ctrlKey && !e.altKey && grid.getActiveCell ()) grid.onDblClick.notify (args, e, this)
			})

        }
        else {
        	
        	let nnu = s => (s || '').toUpperCase ()

        	grid.search = {
        	
        		terms: [], 
        		
        		test: {
        			begins:   (v, sv) => nnu (v).indexOf (nnu (sv)) == 0,
        			contains: (v, sv) => nnu (v).indexOf (nnu (sv)) > -1,
        			in:       (v, sv) => (sv || []).includes (v),
        		}

        	}

        	grid.filter = r => {
        		for (let term of grid.search.terms) if (!grid.search.test [term.operator] (r [term.field], term.value)) return false
        		return true
        	}

        	grid.init_data = clone (o.data)

        	grid.unsetFieldFilter = (field) => {
        		grid.search.terms = grid.search.terms.filter (term => term.field != field)
        	}

			grid.reload = () => {
				grid.setData (grid.init_data.filter (grid.filter))
				grid.invalidate ()
			}

			grid.each = async function (cb) {

				let data = grid.data

				for (let i = 0; i < data.length; i ++) cb.call (data [i], i)

			}

        }
        
		grid.saveAsXLS = async function (fn, cb, o = {}) {
			
			const parent_field = o.parent_field || 'parent'
		
			let cols = grid.getColumns ()

			let html = '<html><head><META HTTP-EQUIV="CONTENT-TYPE" CONTENT="text/html; charset=utf-8"><style>td{mso-number-format:"\@"} td.n{mso-number-format:General} ' + (o.styles || '') + '</style></head><body><table border>'

			html += '<tr>'
			for (let col of cols) html += '<th>' + col.name
			html += '</tr>'
						
			await grid.each (function (row) {

				html += '<tr>'
				
				for (let cell = 0; cell < cols.length; cell ++) {

					if(this[parent_field] && cell == 0){

						let level = this.level ? this.level : 1

						html += `<td style="padding-left: ${15 * level}px;">`

					}else{

						html += `<td>`

					}

					let columnDef = cols [cell]

					let value = this [columnDef.field]

					let formatter = columnDef.formatter; if (formatter) {

						value = formatter (row, cell, value, columnDef, this)

						if (value && typeof value === 'object' && 'text' in value) value = value.text

					}

					if (value != null) {

						if(cell == 0 && typeof value === 'string'){

							value = value.replace(/^(<.*>)?(&nbsp;)+/g, '').replace(/width:16px/g, '')

						}

						html += value

					}

				}

				if (cb) cb (row)

			})
			
			html += '</table></body></html>'

			html.saveAs (fn)
		
		}

		if (o.max_height) {
			grid.onRendered.subscribe(function(e, args) {
				const $gridCanvas = grid.getCanvasNode()
				const $grid = $gridCanvas.closest('[class*=slickgrid_]')
				const headerHeight = $('.slick-pane-header.slick-pane-left', $grid).outerHeight()
				const headerRowHeight = $('.slick-pane-top.slick-pane-left .slick-headerrow', $grid).outerHeight()
				const footerRowHeight = $('.slick-pane-top.slick-pane-left .slick-footerrow', $grid).outerHeight()
				$('.slick-viewport.slick-viewport-top.slick-viewport-left', $grid)
					.css ('max-height', o.max_height)
				$('.slick-pane.slick-pane-top.slick-pane-left', $grid)
					.css ('max-height', o.max_height + headerHeight + headerRowHeight + footerRowHeight)
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
                
        var data = {length: 0}
        var in_progress = {}
        var sortcol = null
        var sortdir = 1
        
        var onDataLoading = new Slick.Event ()
        var onDataLoaded  = new Slick.Event ()

        function init () {}

        function clear () {
            for (k in data) if (k != 'getItemMetadata') delete data [k]
            data.length = 0
        }
        
        async function each (cb) {
			
			for (let i = 0, from = 0, len = data.length; from < len; from += postData.limit) {
			
				let {all, cnt} = await select_all_cnt (from)
				
				for (let one of all) cb.call (one, i ++)
				
			}
			
        }        
        
        function to_all_cnt (data) {
        
        	let all_cnt = {}
        	
        	for (let k in data) 
        		if (k != 'portion') 
        			all_cnt 
        				[k == 'cnt' ? 'cnt' : 'all'] 
        					= data [k]
        	
			return all_cnt
        
        }

        async function select_all_cnt (from) {

			let pd = clone (postData)
			
			pd.offset = from
			pd.search = (pd.search || []).filter (i => i.operator)
			
			return to_all_cnt (await response (tia, pd))
                
        }
        
        async function ensurePage (p) {

			if (in_progress [p]) return

			let portion = postData.limit

			let from = p * portion
			
			if (data [from]) return
			
			let e = {from, to: from + portion - 1}
			
            onDataLoading.notify (e)
            
            	in_progress [p] = 1
            	
            		let {all, cnt} = await select_all_cnt (from)

					let len = all.length

					data.length = parseInt (cnt) || len

					for (var i = 0; i < len; i ++) data [from + i] = all [i]
				
				delete in_progress [p]

            onDataLoaded.notify (e)
        
        }
        
        function ensureData (from, to) {

            if (!(from >= 0)) from = 0

            let len = data.length; if (len > 0 && to >= len) to = len - 1
            
            let [p_from, p_to] = [from, to].map (n => Math.floor (n / postData.limit))

            for (let p = p_from; p <= p_to; p ++) ensurePage (p)
            		
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

          each,
          data,
          postData,

          clear,
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
    	let v = this.canonize (item [this.field])
    	if (defaultValue == null) defaultValue = this.defaultValue = $input [0].defaultValue = v
		$input.val (v).select ()
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
    	let v = this.canonize (item [this.field])
    	if (defaultValue == null) defaultValue = this.defaultValue = $input [0].defaultValue = v
		$input.val (v).select ()
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

function reload_page () {

  if ($_SESSION.delete ('is_confirm_unload')) $(window).off('beforeunload')
  location.reload ()

}

function add_vocabularies (data, o) {

    for (var name in o) {

        let raw = data [name]; if (!raw) continue

        let idx = {}, items = []

        for (let r of raw) {

        	idx [r.id] = r.text = r.label

        	if (r.is_deleted == 1) continue

        	items.push (r)

        }

        idx.items = items

        data [name] = idx

    }

}

async function draw_form (name, data, options) {

	return (await use.jq (name)).draw_form (data, options)
	
}

async function draw_popup (name, data, o = {}) {

	if (!('dialogClass' in o)) o.dialogClass = name

	return (await draw_form (name, data)).draw_popup (o)
	
}

function get_popup () {

    return $('body .ui-dialog:last .ui-dialog-content')
	
}

function close_popup () {

    let $this = get_popup ()
    
    let grid = $this.data ('grid')

    $this.dialog ('close')

    $this.remove ()
    
    if (grid) grid.reload ()

}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_text = $_GET._grid_filter_checkboxes = async function (data) {

	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_text = async function (data) {

	let a = data.a
	let o = data.filter || {}
	
    let $ns = $('<input class=ui-widget>').val (data.value)
    
    $ns.attr ({
        'data-field': a.column.id,
        'data-op': o.op || 'contains',
        placeholder: o.title || a.column.name,
    })
    
    $ns.appendTo ($(a.node))
    
    $ns.change (() => {a.grid.setFieldFilter (a.grid.toSearch ($ns))})

    $(a.node).data ('drop', () => {$ns.val ('')})

}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_checkboxes = async function (data) {

	let a = data.a
	let grid = a.grid
	let o = data.filter || {}
	if (!o.items && a.column.voc) o.items = a.column.voc.items

	data.get_ids = function () {
	
		let loader = grid.loader; if (!loader || !loader.postData || !loader.postData.search) return null

		for (let search of loader.postData.search) 
			if (search.field == a.column.id) 
				return search.value

	}                 

	data.set_ids = function (ids) {

		$(a.node).text (data.label (ids))

		grid.setFieldFilter ({
			field:    a.column.id, 
			operator: 'in',
			value:    ids, 
		})

	}
	
	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_checkboxes = async function (data) {

	let o = data.filter
	let a = data.a
	let grid = a.grid
	
	let name = a.column.id

	let $anode = $(a.node)

	data.label = function (ids) {
		if (!ids || !ids.length) return '[не важно]'
		return ids.map (id => o.items.filter (it => it.id == id) [0].label).join (', ')
	}                 
	
	$anode
		.text  (data.label (data.get_ids ()))
		.click (() => show_block ('_grid_filter_checkboxes_popup', data))
		.data  ('drop', () => {$anode.text (data.label (null))})

}

////////////////////////////////////////////////////////////////////////////////

$_DO.set_all__grid_filter_checkboxes_popup = async function (e) {

	let grid = $("#grid_options").data ('grid')

	grid.setSelectedRows (Array.from (Array (grid.getData ().length).keys ()))

}

////////////////////////////////////////////////////////////////////////////////

$_DO.clear_all__grid_filter_checkboxes_popup = async function (e) {

	$("#grid_options").data ('grid').setSelectedRows ([])

}

////////////////////////////////////////////////////////////////////////////////

$_DO.update__grid_filter_checkboxes_popup = async function (e) {

	let grid = $("#grid_options").data ('grid')

	let ids = grid.getSelectedRows ().map (i => grid.getDataItem (i).id)

	if (!ids.length) ids = null

	get_popup ().data ('data').set_ids (ids)

	close_popup ()

}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_checkboxes_popup = async function (data) {

	delete data._can

	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_checkboxes_popup = async function (o) {

	let filter = o.filter

    let $view = $(`
    
		<span class="drw popup-form">

			<style>

				#grid_options {
					border: solid #ccc 1px;
					width: 100%;
				}

			</style>

			<div id="grid_options" class="drw table" />

			<button name=set_all>Все</button>
			<button name=clear_all>Очистить</button>
			<button name=update>Установить</button>

		</span>

	`)

	$('button', $view).attr ({'data-block-name': '_grid_filter_checkboxes_popup'})

	$view.data ('data', o)
	$view.setup_buttons ()

	$view.draw_popup ({
		title: filter.title,
		width: 400,
		maxHeight: filter.maxHeight || 400,
	})

	let data = filter.items
			
    let grid = $("#grid_options", $view).draw_table ({

        enableCellNavigation: false,

        columns: [
			{
				hideInColumnTitleRow: true,
				class: Slick.CheckboxSelectColumn,
			},
            {	
            	field: "label", 
            },
        ],
        
        data: filter.items

    })
    
    let $c = $(grid.getCanvasNode ())

    let $p = $c.parent ().parent ().parent ().parent ()

    if ($c.height () > $p.height ()) {

    	grid.setOptions ({autoHeight: false})

    	$("#grid_options", $view).height ($p.height () - 10)

    	grid.resizeCanvas ()    

    }

  	let ids = o.get_ids (); if (ids && ids.length > 0) {

		let idx  = {}; for (let id of o.get_ids () || []) idx [id] = 1

		let rows = []; for (let i = 0; i < data.length; i ++) if (idx [data [i].id]) rows.push (i)

		grid.setSelectedRows (rows)

  	}

}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_dates = async function (data) {

	let a = data.a
	let grid = a.grid
	
	let o = data.filter || {}
	let [yyyy, mm, dd] = new Date ().toJSON ().slice (0, 10).split ('-')
	for (let k of ['dt_from', 'dt_to']) {
		if (!(k in o)) continue
		let v = o [k]
		if (v instanceof Date) v = v.toJSON ().slice (0, 10)
		v = v.replace ('YYYY', yyyy).replace ('MM', mm).replace ('DD', dd)
		o [k] = v
	}
	
	data.get_dates = function () {
	
		let loader = grid.loader; if (!loader || !loader.postData || !loader.postData.search) return null

		for (let search of loader.postData.search) 
			if (search.field == a.column.id) 
				return search.value

	}                 

	data.set_dates = function (dt_from, dt_to) {

		$(a.node).text (data.label (dt_from, dt_to))

		grid.setFieldFilter ({
			field:    a.column.id, 
			type:     'date',
			operator: 'between',
			value:    [dt_from, dt_to],
		})

	}

	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_dates = async function (data) {

	let o = data.filter
	let a = data.a
	let grid = a.grid
	
	let name = a.column.id

	let $anode = $(a.node)

	data.label = function (dt_from, dt_to) {
		if (!dt_from && !dt_to) return '[не важно]'
		if (dt_from == dt_to) return dt_dmy (dt_from)
		let s = ''
		if (dt_from) s += ' с '  + dt_dmy (dt_from)
		if (dt_to)   s += ' по ' + dt_dmy (dt_to)
		return s.trim ()
	}                 
	
	let [dt_from, dt_to] = data.get_dates () || []
	
	$anode
		.text  (data.label (dt_from, dt_to))
		.click (() => show_block ('_grid_filter_dates_popup', data))
		.data  ('drop', () => {$anode.text (data.label (null, null))})

}

////////////////////////////////////////////////////////////////////////////////

$_GET._grid_filter_dates_popup = async function (data) {

	delete data._can

	let [dt_from, dt_to] = data.get_dates () || []
	
	if (!data.dt_from) data.dt_from = data.filter.dt_from || dt_from
	if (!data.dt_to)   data.dt_to   = data.filter.dt_to   || dt_to

	return data

}

////////////////////////////////////////////////////////////////////////////////

$_DO.update__grid_filter_dates_popup = async function (e) {

	let $this = get_popup ()
	
	let {dt_from, dt_to} = $this.valid_data ()

	$this.data ('data').set_dates (dt_from, dt_to)

	close_popup ()

}

////////////////////////////////////////////////////////////////////////////////

$_DRAW._grid_filter_dates_popup = async function (o) {

	let filter = o.filter

    let $view = fill ($(`
    
		<span class="drw popup-form">
			
			<table width=100%>
				<tr><td>
					с  <input name=dt_from type=date>
					по <input name=dt_to   type=date>				
			</table>

			<button name=update>Установить</button>

		</span>

	`), o)

	$('*', $view).attr ({'data-block-name': '_grid_filter_dates_popup'})

	$view.data ('data', o)
	$view.setup_buttons ()

	$view.draw_popup ({
		title: filter.title,
		width: 310
	})

}
