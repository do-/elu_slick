(function ($) {

    $.fn.draw_table = function (o) {
    
        $.extend (o, {
            headerRowHeight: 30,    
            rowHeight: 30,
            enableCellNavigation: true,
//            enableColumnReorder: false,
            forceFitColumns: true,                
        })
    
        let loader = !o.url ? null : new Slick.Data.RemoteModel (o.url)

        if (loader) o.data = loader.data

        if (o.columns) for (let c of o.columns) {
            if (!c.id) c.id = c.field            
            if (c.voc) c.formatter = (r, _, v) => c.voc [v]
        }
    
        let grid = new Slick.Grid (this, o.data, o.columns, o)
        
        if (o.onDblClick) grid.onDblClick.subscribe (o.onDblClick)
        
        grid.refresh = () => grid.onViewportChanged.notify ()
        
        if (loader) {
        
            grid.loader = loader

            grid.setFieldFilter = (s) => {
                grid.loader.setSearch (s)
                grid.refresh ()
            }

            loader.onDataLoaded.subscribe (function (e, args) {
                for (var i = args.from; i <= args.to; i ++) grid.invalidateRow (i)
                grid.updateRowCount ()
                grid.render ()
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

                    var c       = d.content       ; delete c.portion
                    data.length = parseInt (c.cnt); delete c.cnt

                    var l; for (var k in c) l = c [k]

                    for (var i = 0; i < l.length; i ++) {
                        var r = l [i]
                        r.index = from + i
                        data [from + i] = r
                    }

                    req = null

                    onDataLoaded.notify ({from: from, to: to})

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

})(jQuery)