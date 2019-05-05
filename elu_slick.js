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
    

    $.fn.draw_form = function (data) {
    
        var $view = fill (this, data)
        
        let is_edit = (name) => {switch (name) {
            case 'update':
            case 'cancel':
                return true
            default:
                return false
        }}

        let read_only = {
        
            off: () => {

                $('button', $view).each (function () {
                    if (!is_edit (this.name)) $(this).hide (); else $(this).show ()
                })
                
                $(':input', $view).not ('button').each (function () {
                    $(this).prop ({disabled: 0})
                })

            },
            
            on: () => {

                $('button', $view).each (function () {
                    if (is_edit (this.name)) $(this).hide (); else $(this).show ()
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
    
        $.extend (o, {
            headerRowHeight: 30,    
            rowHeight: 30,
            enableCellNavigation: true,
            forceFitColumns: true, 
        })

        if (!o.searchInputs) o.searchInputs = []
        
        let loader = !o.url ? null : new Slick.Data.RemoteModel (o.url)

        if (loader) o.data = loader.data

        if (o.columns) for (let c of o.columns) {
            if (!c.id) c.id = c.field            
            if (c.voc) c.formatter = (r, _, v) => c.voc [v]
        }

        let grid = new Slick.Grid (this, o.data, o.columns, o)
        
        if (o.onDblClick) grid.onDblClick.subscribe (o.onDblClick)
        
        grid.refresh = () => grid.onViewportChanged.notify ()
        
        grid.reload = () => {
            loader.clear ()
            grid.refresh ()
        }
        
        if (loader) {
        
            grid.loader = loader
            
            function toSearch ($input) {
            
                function op (tag) {switch (tag) {
                    case 'INPUT': return 'begins'
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
                loader.setSearch (toSearch ($i))
                switch (tag) {
                    case 'INPUT':
                        $i.keyup ((e) => {if (e.which == 13) grid.setFieldFilter (toSearch ($i))})
                        break
                    case 'SELECT':
                        $i.selectmenu ({
                            width: true,
                            change: () => {grid.setFieldFilter (toSearch ($i))}
                        })
                        break
                }
            }

            grid.setFieldFilter = (s) => {
                grid.loader.setSearch (s)
                grid.refresh ()
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
                grid.refresh ()
            })

        }
                
        $(window).on ('resize', function (e) {grid.resizeCanvas ()})
        
        setTimeout (grid.refresh, 0) // load the first page
        
        this.data ('grid', grid)

        return grid

    }

    function RemoteModel (tia, postData) {
    
        if (!postData) postData = {}
        postData.searchLogic = 'AND'
        if (!postData.search) postData.search = []
        if (!postData.limit)  postData.limit = 50 

        var data = {length: 0}
        var sortcol = null
        var sortdir = 1
        var h_request = null
        var req = null
        
        var onDataLoading = new Slick.Event ()
        var onDataLoaded  = new Slick.Event ()

        function init () {}

        function isDataLoaded (from, to) {
            for (var i = from; i <= to; i ++) if (!data [i]) return false
            return true;
        }

        function clear () {
            for (k in data) delete data [k]
            data.length = 0
        }

        function ensureData (from, to) {
    
            if (req) {
                req.abort ()
                for (var i = req.fromPage; i <= req.toPage; i ++)
                data [i * postData.limit] = undefined
            }

            if (from < 0) from = 0

            if (data.length > 0) to = Math.min (to, data.length - 1)

            var fromPage = Math.floor (from / postData.limit)
            var toPage   = Math.floor (to   / postData.limit)

            while (data [fromPage * postData.limit] !== undefined && fromPage < toPage) fromPage ++
            while (data [toPage   * postData.limit] !== undefined && fromPage < toPage)   toPage --

            if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * postData.limit] !== undefined)) {
                onDataLoaded.notify ({from: from, to: to})
                return;
            }

            postData.offset = fromPage * postData.limit

            h_request = setTimeout (function () {

                for (var i = fromPage; i <= toPage; i ++) data [i * postData.limit] = null

                onDataLoading.notify ({from: from, to: to});

                req = $.ajax (dynamicURL (tia), {
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

                    req = null

                    onDataLoaded.notify ({from, to})

                })

                .fail (function (jqXHR, e) {
                    $_DO.apologize ({jqXHR: jqXHR, error: e}, fail)
                })  

                req.fromPage = fromPage;
                req.toPage   = toPage;

            }, 50)

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