reactomeProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('reactomeProcessor called');
	
	this.jumpmap	= {};
	this.revjumpmap	= {};

	this.B_biopax3	= true;
	this.S_type		= 'R-';
	this.F_url		= function(id) {
		return this.B_biopax3 ? 'http://www.reactome.org/ReactomeRESTfulAPI/RESTfulWS/biopaxExporter/Level3/'+id
		: 'http://www.reactome.org/ReactomeRESTfulAPI/RESTfulWS/sbmlExporter/'+id;
	};
	this.F_pwayID	= function(v) { return v.substring(6); };
	this.F_getTitle	= this.B_biopax3 ? this.bp3getTitle : function(xml) {
		return xml.getElementsByTagName('model')[0].getAttribute('name');
	};
	this.F_init = this.B_biopax3 ? this.bp3initialize : undefined;
	this.F_getNode = this.B_biopax3 ? this.bp3getNodes : function(xml) {
		var _ = this;
		var A_ret = [];
		var A_nodes = xml.getElementsByTagName('glyph');
		/* For each <glyph> */
		for (var i in A_nodes) {
			if (!A_nodes.hasOwnProperty(i)) continue;
			i = A_nodes[i];
			
			// nodetype and nodeid are required
			// define class from type
			if (!(I = i.get({'type':'class', 'id':'id'}))) continue;
			
			/* Do not consider class="process" */
			if (I.type == 'process' || I.type == 'annotation' ||
				I.type == 'unit of information') continue;
			
			/* Add to <glyph> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}
		return A_ret;
	};
	this.F_getEdge = this.B_biopax3 ? this.bp3getEdges : function(xml) {
		var A_ret = [];
		if (this.B_biopax3) {
			return A_ret; // FIXME
			var A_edges = xml.getElementsByTagNameNS(this.bp, 'BiochemicalReaction');
			for (var i in A_edges) {
				if (!A_edges.hasOwnProperty(i)) continue;
				i = A_edges[i];

				/* Process <bp:BiochemicalReaction> */
				this.bp3procBiochemicalReaction(i);

				/* Add to <arc> */
				for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
				A_ret.push(i);
			}
		} else {
			var A_edges = xml.getElementsByTagName('arc');
			for (var i in A_edges) {
				if (!A_edges.hasOwnProperty(i)) continue;
				i = A_edges[i];
				
				/* source, target entry is required */
				if (!(I = i.get(['source', 'target']))) continue;
				
				/* Add to <arc> */
				for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
				A_ret.push(i);
			}
		}
		return A_ret;
	};
	this.F_annotate = this.B_biopax3 ? this.bp3annotate : function() {
		var protID2symbol = {};

		// #SmallMoleculeXX -> displayName
		var A_sm = this.H_xml.getElementsByTagNameNS(this.bp, 'SmallMolecule');
		var N_anno = 0;
		for (var i=0 ; i<A_sm.length ; i++) {
			/* Should have rdf:ID */
			var _i = A_sm[i].getAttributeNS(this.rdf, 'ID');
			if (!_i) continue;
			/* Should have bp:displayName */
			var _n = A_sm[i].getElementsByTagNameNS(this.bp, 'displayName');
			if (_n.length < 1) continue;
			protID2symbol[_i] = _n[0].textContent;
			N_anno++;
		}
		Lcmt('[' + N_anno + '] smallMolecule annotations ready');

		// #ProteinXX -> displayName
		N_anno = 0;
		for (var i in this.A_entry) {
			if (!this.A_entry.hasOwnProperty(i)) continue;
			i = this.A_entry[i];
			if (i.id.substring(0,3) != "Pro") continue;
			protID2symbol[i.id] = i.name;
			N_anno++;
		}
		Lcmt('[' + N_anno + '] protein annotations ready');
		// For all A_entry
		for (var i in this.A_entry) {
			if (!this.A_entry.hasOwnProperty(i)) continue;
			i = this.A_entry[i];
			var res = [];
			// If .gene
			if (undefined !== i.gene) for (var j=0 ; j<i.gene.length ; j++) {
				// If needs annotation
				if (i.gene[j].charAt(0) != '#') continue;
				switch (i.gene[j].substring(1, 4)) {
				case 'Sma':
				case 'Pro':
					res.push(protID2symbol[i.gene[j].substring(1)]);
					break;
				default:
					Lwarn('Unknown annotation ID ['+i.gene[j]+']');
				}
			}
			if (res.length) {
				Ldebug('Annotate ['+i.id+'] : ['+i.gene.join(' ')+'] -> ['+res.join(' ')+']');
				i.symbol = res.join(' ');
			}
		}
	};
	this.F_initEntry = this.B_biopax3 ? this.bp3initEntries : function() {
		var _ = this;
		this.A_nodes.forEach(function(I) {
			/* If this <entry> does not contain, log them */
			if (I.getElementsByTagName('label').length == 0 ||
				!I.getElementsByTagName('label')[0].hasAttribute('text')) {
				Lwarn('Insufficient <entry> tag found');
				console.log(I);
				return;
			}
			var _n = I.getElementsByTagName('label')[0].getAttribute('text');
		
			switch (I.type) {
			case 'macromolecule': I.type = 'gene'; break;
			case 'simple chemical': I.type = 'compound'; break;
			default: break;
			}
			I.name = _n;

			/* For <entry type=''> */
			switch (I.type) {
			case 'complex':
			case 'gene': { // 'macromolecule'
					I.symbol = I.gene = _n.split(' ');
				} break;
			case 'compound' : { // 'simple chemical'
					I.symbol = I.compound = _n.split(' ');
				} break;
			default:
				Lcmt("Name:" + _n + ", Type:" + I.type);
				break;
			}

			/* Insert to A_entry */
			_.A_entry[I.id] = I;
		});
	};
	this.F_preprocess = this.B_biopax3 ? this.bp3preprocess : function(xml) {
		var A_allNodes	= xml.getElementsByTagName('glyph');
		
		/* Find processes in <entry> */
		for (var i in A_allNodes) {
			if (!A_allNodes.hasOwnProperty(i)) continue;
			i = A_allNodes[i];
			
			// nodetype and nodeid are required
			if (!(I = i.get(['class', 'id']))) continue;
			
			/* Get type and check class="process" */
			if (I.class != 'process') continue;
			
			/* Get <port> and should have length */
			var _p = i.getElementsByTagName('port');
			if (_p.length == 0) {
				console.log('entry id ['+I.id+'] does not interpretable');
				continue;
			}
			/* Create mapping */
			this.revjumpmap[I.id] = [];
			for (var j=0 ; j<_p.length ; j++) {
				var _si = _p[j].getAttribute('id');
				this.jumpmap[_si] = I.id;
				this.revjumpmap[I.id].push(_si);
			}
		}
	};

	return this.init(S_pwayID);
};
reactomeProcessor.prototype = new pathwayProcessor();
reactomeProcessor.prototype.constructor = reactomeProcessor;
