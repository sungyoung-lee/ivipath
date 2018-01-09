keggProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('keggProcessor called');
	
	this.S_type 	= 'hs';
	this.F_url		= function(id) {
		return 'http://www.kegg.jp/kegg-bin/download?format=kgml&entry='+id;
	};
	this.F_urlOption= function(id) {
		return 'http://www.kegg.jp/kegg-bin/show_pathway?'+id;
	};
	/* Type-specific compound identifier => official compound symbol */
	this.A_cpndId2Symbol = {};
	/* Type-specific gene identifier => official gene symbol */
	this.A_geneId2Symbol = {};
	this.graphId2groupMember = {};	
	this.F_getTitle	= function(xml) {
		return xml.getElementsByTagName('pathway')[0].getAttribute('title');
	};
	this.F_getNode	= function(xml) {
		var A_ret	= [];
		var A_nodes	= xml.getElementsByTagName('entry');
		/* For each <entry> */
		for (var i in A_nodes) {
			if (!A_nodes.hasOwnProperty(i)) continue;
			i = A_nodes[i];			

			/* If this <entry> does not contain, log them */
			if (!(I = i.get(['name', 'type', 'id'], ['link']))) continue;
			
			/* Add to <entry> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}		
		return A_ret;
	};
	this.F_getEdge	= function(xml) {
		var A_ret	= [];
		var A_edges	= xml.getElementsByTagName('relation');
		/* For each <relation> */
		for (var i in A_edges) {
			if (!A_edges.hasOwnProperty(i)) continue;
			i = A_edges[i];	
			
			/* If this <relation> does not contain, log them */
			if (!(I = i.get(['entry1', 'entry2', 'type']))) continue;
			
			/* Add to <relation> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}
		return A_ret;
	};
	this.F_annotate	= function() {
		var _ = this;
		/* FOR GENE */ {
			// Collect empty keys
			var A_keggidval = [];
			for (var i in this.A_geneId2Symbol)
				if (this.A_geneId2Symbol[i] == "") A_keggidval.push(i);

			// Query them
			Ldebug("Query genesymbol of ["+A_keggidval.length+"] keggid");
			$.ajax({
				type:'post',
				url:'keggid2genesymbol.php',
				dataType:'json',
				data:{
					keys:A_keggidval.join('|')
				},
				async:false,
				success:function(a) {
					for (var i in a) {
						Ldebug("GENE ["+i+"] -> ["+a[i]+"]");
						_.A_geneId2Symbol[i] = a[i];
					}
				}		
			});

			// Remap them on object
			for (var i in this.A_entry) {
				i = this.A_entry[i];
				if (typeof i.gene == 'undefined') continue;

				i.symbol = [];
				for (var j in i.gene)
					i.symbol.push(this.A_geneId2Symbol[i.gene[j]]);
			}
		}
		/* FOR COMPOUND */ {
			// Key to value
			var A_compoundidval = [];
			for (var i in this.A_cpndId2Symbol)
				if (this.A_cpndId2Symbol[i] == "") A_compoundidval.push(i);

			// Query them
			Ldebug("Query compoundsymbol of ["+A_compoundidval.length+"] compoundid");
			$.ajax({
				type:'post',
				url:'compoundid2compoundname.php',
				dataType:'json',
				data:{
					keys:A_compoundidval.join(' ')
				},
				async:false,
				success:function(a) {
					for (var i in a) {
						Ldebug("COMPOUND ["+i+"] -> ["+a[i]+"]");
						_.A_cpndId2Symbol[i] = a[i];
					}
				}  
			});
	  
			// Remap them on object
			for (var i in this.A_entry) {
				i = this.A_entry[i];
				if (typeof i.compound == 'undefined') continue;

				i.symbol = [];
				for (var j in i.compound)
					i.symbol.push(this.A_cpndId2Symbol[i.compound[j]]+' ('+i.compound[j]+')');
			}
		}
	};
	this.F_initEntry = function() {
		var _ = this;
		this.A_nodes.forEach(function(I) {
			/* For <entry type=''> */
			switch (I.type) {
			case 'map':
				I.symbol = I.getElementsByTagName('graphics')[0].getAttribute('name');
				break;
			case 'gene': {
					var tmp = I.name.replace(/hsa:/gi, '');
					I.gene = tmp.split(' ');
					// Get IDs of all genes
					I.gene.forEach(function(v) {
						if (typeof _.A_geneId2Symbol[v] == 'undefined')
							_.A_geneId2Symbol[v] = "";
					});
				} break;
			case 'compound': {
					var tmp = I.name.replace(/cpd:/gi, '');
					I.compound = tmp.split(' ');
					// Get IDs of all genes
					I.compound.forEach(function(v) {
						if (typeof _.A_cpndId2Symbol[v] == 'undefined')
							_.A_cpndId2Symbol[v] = "";
					});
				} break;
			case 'group': /* Check child components */ {
					var childs = I.getElementsByTagName('component');
					var ids = [];
					for (var j=0 ; j<childs.length ; j++)
						ids.push(childs[j].getAttribute('id'));
					_.graphId2groupMember[I.id] = ids;
					I.group = 'group'+I.id;
				} break;
			default:
				Lwarn("Name:" + I.name + ", Type:" + I.type);
				break;
			}

			/* Insert to A_entry */
			_.A_entry[I.id] = I;
		});
	};
	
	return this.init(S_pwayID);
};
keggProcessor.prototype = new pathwayProcessor();
keggProcessor.prototype.constructor = keggProcessor;
