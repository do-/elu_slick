(function ($) {

    function RemoteModel (tia, postData) {
    
        var PAGESIZE = 50
        var data = {length: 0}
        var sortcol = null
        var sortdir = 1
        var h_request = null
        var req = null
        if (!postData) postData = {}

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
                data [i * PAGESIZE] = undefined
            }

            if (from < 0) from = 0

            if (data.length > 0) to = Math.min (to, data.length - 1)

            var fromPage = Math.floor (from / PAGESIZE)
            var toPage   = Math.floor (to   / PAGESIZE)

            while (data [fromPage * PAGESIZE] !== undefined && fromPage < toPage) fromPage ++
            while (data [toPage   * PAGESIZE] !== undefined && fromPage < toPage)   toPage --

            if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
                onDataLoaded.notify ({from: from, to: to})
                return;
            }

            postData.offset = fromPage * PAGESIZE
            postData.limit  = PAGESIZE

            h_request = setTimeout (function () {

                for (var i = fromPage; i <= toPage; i ++) data [i * PAGESIZE] = null

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

        function setSort (column, dir) {
            sortcol = column
            sortdir = dir
            clear ()
        }

        function setSearch (str) {
        
            if (str) {
                postData.searchLogic = 'OR'
                postData.search = [{field: "label", value: str}]
            }            
            else {
                delete postData.searchLogic
                delete postData.search
            }
            
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