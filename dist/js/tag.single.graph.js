import {Config} from './proj.config.js'
import {Util} from './proj.util.js'
export class TagSingleGraph {

    constructor(elementId) {

        this._echarts = echarts.init(document.getElementById(elementId));
        this._echarts.on('click', this._clickEvt.bind(this));

        this._chartOptions = {};

        this._selectTagName = null;
        this._categories = [
            { name: "操作" },
            { name: "器件" },
            { name: "故障" }
        ];

        this._nodesData = null;
        this._linkData = null;
        this._docData = null;
        this._tagDocData = null;
        this._timeData = null;

    }

    async getData() {
        this._nodesData = await Util.readFile('data/标签关联点-时间戳.csv');
        this._linkData = await Util.readFile('data/标签关联边-时间戳-无向.csv');
        this._tagDocData = await Util.readFile('data/标签关联文章列表.csv');
        this._docData = await Util.readFile('data/文章列表.csv');
        this._timeData = await Util.readFile('data/标签关联最大值最小值-时间戳.csv');
    }

    loadData(callback, selectTagName) {
        var self = this;
        this._selectTagName = selectTagName;
        if(!this._nodesData || !this._linkData || !this._tagDocData || !this._docData || !this._timeData) {
            $('#loading').css('display', 'block');
            this.getData().then(function () {
                self._callbackFunc();
                callback();
            });
        } else {
            callback();
        }
    }

    getDocDetailById(id) {
        var data = this._docData.where(o => o.id === id);
        return data;
    }

    getTableData() {
        var tagdoc = this._tagDocData.where(o => o.tag_name === this._selectTagName)
        return tagdoc;
    }

    getDocsByids(ids) {
        var filterdata = [];
        if(ids && ids.length) {
            filterdata = this._docData.where(function (o) {
                return ids.indexOf(o.id) !== -1;
            });
        }
        return filterdata;

    }

    _callbackFunc() {
        $('#loading').css('display', 'none');
        let { startTime, endTime } = this.getStartEndTime();
        this._startTime = startTime;
        this._endTime = endTime;
    }

    getStartTime() {
        return this._startTime;
    }

    getEndTime() {
        return this._endTime;
    }

    updateGraph(startTime, endTime) {
        var nodes = this.getNodes(startTime, endTime);
        var links = this.getLinks(startTime, endTime);
        var options = this.getChartOptions(this._categories, nodes, links);
        this._echarts.setOption(options);
    }

    getStartEndTime() {
        var ts = this._timeData.where(o => o.selected_tag_name === this._selectTagName);
        if(ts.length) {
            return {
                startTime: ts[0].min_time,
                endTime: ts[0].max_time
            }
        }
    }

    getNodes(startTime, endTime) {
        var nodes = [];
        var select_nodes = this._nodesData.where(o => o.selected_tag_name === this._selectTagName && o.create_time <= endTime && o.create_time >= startTime);
        for(let i = 0, len = select_nodes.length; i < len; i++) {
            let n = select_nodes[i];
            let j = 0;
            let lenj = nodes.length;
            for(; j < lenj; j++) {
                if(n.p_tag_name === nodes[j].name) {
                    nodes[j].value += 1;
                    break;
                }
            }
            if(j === lenj) {
                nodes.push({
                    symbol: n.p_tag_name === this._selectTagName ? 'roundRect' : 'circle',
                    category: Config.categories.indexOf(n.p_tag_type),
                    name: n.p_tag_name,
                    value: 1
                });
            }
        }
        // console.log(nodes);
        return nodes;
    }

    getLinks(startTime, endTime) {
        var links = [];
        var select_links = this._linkData.where(o => o.selected_tag_name === this._selectTagName && o.create_time <= endTime && o.create_time >= startTime);
        for(let i = 0, len = select_links.length; i < len; i++) {
            let lnk = select_links[i];
            let j = 0;
            let lenj = links.length;
            for(; j < lenj; j++) {
                let lnkj = links[j];
                if(lnk.S_tag_name === lnkj.source && lnk.T_tag_name === lnkj.target && lnkj.docids.indexOf(lnk.doc_id) === -1) {
                    lnkj.docids.push(lnk.doc_id);
                    lnkj.value += 1;
                    break;
                }
            }
            if(j === lenj) {
                links.push({
                    source: lnk.S_tag_name,
                    target: lnk.T_tag_name,
                    value: 1,
                    docids: [lnk.doc_id]
                });
            }
        }
        // console.log(links);
        return links;
    }

    getChartOptions(categories, nodes, links) {
        var options = {
            title: {
                text: this._selectTagName
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}'
            },
            toolbox: {
                show: true,
                feature: {
                    restore: { show: true },
                    magicType: { show: true, type: ['force', 'chord'] },
                    saveAsImage: { show: true }
                }
            },
            legend: {
                data: categories
            },
            series: [{
                name: '单标签',
                type: 'graph',
                layout: 'circular', //'force', 'circular'
                categories: categories,
                nodes: nodes,
                links: links,
                roam: true,
                force: { //force -start
                    repulsion: 100,
                    edgeLength: [80, 400]
                },
                focusNodeAdjacency: false,
                draggable: true, // forec-end               
                symbolSize: 20,
                itemStyle: {
                    normal: {},
                    emphasis: {}
                },
                lineStyle:{
                    normal:{color:"black",
                width:1},
                    emphasis:{color:"black",
                width:1}
                },                
                label: {
                    normal: {
                        show: true,
                        position: 'left'
                    },
                    emphasis: {
                        show: true
                    }
                }
            }]
        };
        return options;
    }

    addChartClickCallback(callback) {
        this._chartClickCallback = callback;
    }

    _clickEvt(param) {
        if(this._chartClickCallback) {
            this._chartClickCallback(param);
        }
        // console.log(param.data);
    }

}