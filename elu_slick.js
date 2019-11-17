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
    
    $.fn.on_change = function (todo) {
    	let p = this.parents ()
    	let a = p [p.length - 1]
    	todo.call (a, or_null (this.val ()))
    	this.on ('change', function () {todo.call (a, or_null (this.value))})
    }

    $.fn.valid_data = function () {
	    return values (this).actual ().validated ()
    }

    $.fn.draw_form = function (data) {

        var $view = fill (this, data)
        
        let is_edit = (name) => {switch (name) {
            case 'update':
            case 'cancel':
                return true
            default:
                return false
        }}

        let is_visible = (name, is_ro) => {

            if (name == 'undelete') return data.is_deleted

            if (data.is_deleted) return false

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

            },

            again: (e) => {

                if (!confirm ('Отменить внесённые изменения?')) return

                refill (data, $(e.target).parent ().prev ())

                read_only.on ()

            }

        }

        clickOn ($('button[name=edit]', $view), read_only.off)
        clickOn ($('button[name=cancel]', $view), read_only.again)

        read_only.on ()
        
        return $view
        
    }
    
    $.fn.draw_table = function (o) {    
    
        if (!o.searchInputs) o.searchInputs = []
        
        if (o.showHeaderRow) {
            o.explicitInitialization = true
        }
    
        $.extend (o, {
            headerRowHeight: 26,    
            rowHeight: 26,
            enableCellNavigation: true,
            forceFitColumns: true, 
        })

		if (o.src) {
			let src = Array.isArray (o.src) ? o.src : [o.src]
			o.url = {type: src [0]}
			if (src.length > 1) o.postData = src [1]
		}

        let loader = !o.url ? null : new Slick.Data.RemoteModel (o.url, o.postData)

        if (loader) o.data = loader.data
        
        if (!o.data.getItemMetadata) o.data.getItemMetadata = o.getItemMetadata || function (row) {
            let r = o.data [row]
            if (r == null) return 
            if (r.is_deleted) return {cssClasses: 'deleted'}
        }

        if (o.columns) for (let c of o.columns) {
            if (!c.id) c.id = c.field            
            if (c.voc) c.formatter = (r, _, v) => c.voc [v]
        }

        let grid = new Slick.Grid (this, o.data, o.columns, o)
        
        if (o.showHeaderRow) {
        
            let f = o.onHeaderRowCellRendered || ((e, a) => {            
                let filter = a.column.filter            
                if (filter) return a.grid.colFilter [filter.type] (a, filter)
                $(a.node).text ('\xa0')            
            })
            
            o.onHeaderRowCellRendered = (e, a) => {

                f (e, a)

                if (!loader) return

                let col = a.column; if (!col.filter) return

                let $anode = $(a.node)

                let drop = $anode.data ('drop'); if (!drop) return

                $anode
                
                .mouseenter (() => {
                
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
        ]) grid [i].subscribe (o [i])
        
        grid.refresh = () => grid.onViewportChanged.notify ()
        
        grid.reload = () => {
            loader.clear ()
            grid.setData (loader.data, true)
            grid.refresh ()
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
            
            grid.colFilter = {

                text: (a, o) => {

                    if (!o) o = {}
                
                    let $ns = $(`<input class=ui-widget>`)
                    
                    $ns.attr ({
                        name: a.column.id,
                        placeholder: o.title || a.column.name,
                    })
                    
                    $ns.appendTo ($(a.node))
                    
                    $ns.change (() => {grid.setFieldFilter (grid.toSearch ($ns))})

                    $(a.node).data ('drop', () => {$ns.val ('')})

                },
                
                checkboxes: (a, o) => {
                
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

            }            

            loader.onDataLoaded.subscribe ((e, args) => {
                for (var i = args.from; i <= args.to; i ++) grid.invalidateRow (i)
                grid.updateRowCount ()
                grid.render ()
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

        }
                
        $(window).on ('resize', function (e) {grid.resizeCanvas ()})
        
        setTimeout (grid.refresh, 0) // load the first page
        
        this.data ('grid', grid)
        
        if (o.explicitInitialization) grid.init ()

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

          data: data,
          postData: postData,

          clear: clear,
          isDataLoaded: isDataLoaded,
          ensureData: ensureData,
          reloadData: reloadData,
          setSort: setSort,
          setSearch: setSearch,

          onDataLoading: onDataLoading,
          onDataLoaded: onDataLoaded

        }
    
    }

    $.extend (true, window, {Slick: {Data: {RemoteModel: RemoteModel}}})

})(jQuery);

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
