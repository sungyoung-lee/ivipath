keggProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('keggProcessor called');
	
	this.S_type	 		= 'hs';
	this.F_url			= function(id) {
		return 'pathway.php?id='+id;
	};
	/* Type-specific compound identifier => official compound symbol */
	this.A_cpndId2Symbol = {};
	/* Type-specific gene identifier => official gene symbol */
	this.A_geneId2Symbol = {};
	this.graphId2groupMember = {};	
	this.F_getTitle	= function(xml) {
		return xml.getElementsByTagName('pathway')[0].getAttribute('title');
	};
	this.getSuperNodeId = function() {
		Lnotice("Supernode ["+this.N_idSuper+"] requested");
		return this.N_idSuper++;
	};
	this.F_getNode	= function(xml) {
		var A_ret	= [];
		var A_nodes	= xml.getElementsByTagName('entry');

		//this.A_id2elem = {};
		this.N_idSuper = 1;
		this.A_snodeMap = {};

		/* For each <entry> */
		for (var i in A_nodes) {
			if (!A_nodes.hasOwnProperty(i)) continue;
			i = A_nodes[i];			

			/* If this <entry> does not contain, log them */
			if (!(I = i.get(['name', 'type', 'id'], ['link']))) continue;
			//this.A_id2elem[I.id] = this.A_id2elem[I.name] = i;
			
			if (I.type == 'group') {
				// Make supernode
				var tmp = document.createElement("ivip-node");
				tmp.id = 'ivipSuperNode'+this.getSuperNodeId();
				tmp.origin = i;
				tmp.type = 'cpx';
				var coms = i.getElementsByTagName('component');
				var A_comp = [];
				for (var j=0 ; j<coms.length ; j++)
					A_comp.push(xml.getElementById(coms[j].getAttribute('id')));
				tmp.member = A_comp;
				this.A_snodeMap[I.id] = tmp;

				i = tmp;
			} else {
				/* Add to <entry> */
				for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			}
			A_ret.push(i);
		}		
		return A_ret;
	};
	this.F_getEdge	= function(xml) {
		var elements2array = function(v) {
			var ret = [];
			for (var i=0 ; i<v.length ; i++)
				ret.push(xml.getElementById(v[i].getAttribute("id")));
			return ret;
		};
		var A_ret	= [];
		var A_edges	= xml.getElementsByTagName('relation');
		/* For each <relation> */
		for (var i in A_edges) {
			if (!A_edges.hasOwnProperty(i)) continue;
			i = A_edges[i];	
			
			/* If this <relation> does not contain, log them */
			if (!(I = i.get(['entry1', 'entry2', 'type']))) continue;
			i.from	= xml.getElementById(I.entry1);
			i.to	= xml.getElementById(I.entry2);
			i.type	= I.type;
			var J = i.getElementsByTagName('subtype');
			var nt = [];
			for (var j=0 ; j<J.length ; j++)
				switch (J[j].getAttribute('name')) {
				case 'phosphorylation':
				case 'dephosphorylation':
					if (i.special === undefined) i.special = [];
					i.special.push(J[j].getAttribute('name'));
					break;
				case 'indirect effect':
				case 'binding/association':
				case 'missing interaction':
					nt.push(J[j].getAttribute('name').replace(/ \//,'')); break;
				case 'inhibition':
				case 'expression':
				case 'repression':
				case 'state change':
				case 'dissociation':
				case 'glycosylation':
				case 'ubiquitination':
				case 'methylation':
				case 'activation': nt.push(J[j].getAttribute('name')); break;
				}
			if (nt.length) i.type = nt.join(" ");
			/* Add to <relation> */
			//for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
			this.A_component.push(i);
		}
		var A_edges	= xml.getElementsByTagName('reaction');
		for (var i in A_edges) {
			if (!A_edges.hasOwnProperty(i)) continue;
			i = A_edges[i];			
			/* If this <relation> does not contain, log them */
			if (!(I = i.get(['id', 'name', 'type']))) continue;

			var F = elements2array(i.getElementsByTagName('substrate'));
			var T = elements2array(i.getElementsByTagName('product'));
			
			/* Create supernode
			var tmp = document.createElement("ivip-node");
			tmp.id = 'ivipSuperNode'+this.getSuperNodeId();
			tmp.origin = i;
			tmp.type = 'tsp';
			this.A_nodes.push(tmp);*/
			
			// Create supernode if needed
			var _F = F[0];
			if (F.length > 1) {
				var tmp = document.createElement("ivip-node");
				tmp.id = 'ivipSuperNode'+this.getSuperNodeId();
				tmp.origin = i;
				tmp.member = F;
				tmp.type = 'bcr';
				this.A_nodes.push(tmp);
				_F = tmp;
			}
			var _T = T[0];
			if (T.length > 1) {
				var tmp = document.createElement("ivip-node");
				tmp.id = 'ivipSuperNode'+this.getSuperNodeId();
				tmp.origin = i;
				tmp.member = T;
				tmp.type = 'bcr';
				this.A_nodes.push(tmp);
				_T = tmp;
			}
			
			i.from	= _F;
			i.to	= _T;
			i.type	= I.type;
			A_ret.push(i);			
			
			this.A_component.push(i);
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
				i.ref = [];
				i.gene.forEach(function(j) {
					var sym = _.A_geneId2Symbol[j];
					i.symbol.push(sym);
					i.ref.push({db:'kegg',id:j,anno:sym});
				});
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
				i.ref = [];
				i.compound.forEach(function(j) {
					var sym = _.A_cpndId2Symbol[j];
					i.symbol.push(sym);
					i.ref.push({db:'kegg compound',id:j.replace(/cpd:/,''),anno:sym});
				});
			}
		}
	};
	this.F_initEntry = function() {
		var _ = this;
		this.A_nodes.forEach(function(I) {
			/* For <entry type=''> */
			switch (I.type) {
			case 'map':
				I.symbol = [I.getElementsByTagName('graphics')[0].getAttribute('name')];
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
