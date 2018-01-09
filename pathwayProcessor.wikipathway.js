wikipathwayProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('wikipathwayProcessor called');

	this.B_biopax3	= false;
	this.S_type		= 'WP';
	this.F_url		= function(id) {
		return 'https://www.wikipathways.org/wpi/wpi.php?action=downloadFile' +
					'&type='+(this.B_biopax3?'owl':'gpml')+'&pwTitle=Pathway:'+id;
	};
	/* Key = GroupId, Value = GraphId */
	this.A_grp2gph	= {};
	/* Key = GraphId of the group, Value = Array of GraphId belongs to the group */
	this.A_grp2mem	= {};
	this.F_getTitle	= this.B_biopax3 ? this.bp3getTitle : function(xml) {
		return xml.childNodes[0].getAttribute('Name');
	};
	this.F_annotate = this.B_biopax3 ? this.bp3annotate : function() {
		for (var i in this.A_entry) {
			if (!this.A_entry.hasOwnProperty(i)) continue;
			i = this.A_entry[i];
			
			if (i.gene !== undefined) {
				var A_gene = [];
				i.gene.forEach(function(j) {
					switch (j.database) {
					case 'HGNC':
						if (parseInt(j.id) > 0)
							$.ajax({
								type:'post',
								url:'hgncid2genesymbol.php',
								dataType:'json',
								data:{
									keys:j.id
								},
								async:false,
								success:function(a) {
									A_gene.push(a[j.id]);
								}  
							});
						else
							A_gene.push(j.id);
						break;
					case 'entrez':
						if (parseInt(j.id) > 0)
							$.ajax({
								type:'post',
								url:'hgncid2genesymbol.php',
								dataType:'json',
								data:{
									keys:j.id
								},
								async:false,
								success:function(a) {
									A_gene.push(a[j.id]);
								}  
							});
						else
							A_gene.push(j.id);
						break;
					}
				});
				if (A_gene.length) {
					Lcmt("Update GENE symbol ["+i.symbol+"] -> ["+A_gene.join(' ')+"]")
					i.symbol = A_gene.join(' ');
				}
			}
		}
	};
	this.F_getNode	= this.B_biopax3 ? this.bp3getNodes : function(xml) {
		var A_ret = [];
		var A_nodes = xml.getElementsByTagName('DataNode');
		/* For each <DataNode> */
		for (var i in A_nodes) {
			if (!A_nodes.hasOwnProperty(i)) continue;
			i = A_nodes[i];
			
			/* If this <DataNode> does not contain, log them */
			if (!(I = i.get({name:'TextLabel', type:'Type', id:'GraphId'}, ['GroupRef']))) continue;
			
			/* Add to <DataNode> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}
		var A_nodes2 = xml.getElementsByTagName('Label');
		/* For each <Label> */
		for (var i in A_nodes2) {
			if (!A_nodes2.hasOwnProperty(i)) continue;
			i = A_nodes2[i];
			
			/* If this <DataNode> does not contain, log them */
			if (!(I = i.get({name:'TextLabel', id:'GraphId'}))) continue;
			
			/* Add to <DataNode> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}
		return A_ret;
	};
	this.F_getEdge	= this.B_biopax3 ? this.bp3getEdges : function(xml) {
		var A_ret = [];
		var A_edges = xml.getElementsByTagName('Interaction');
		/* For each <Interaction> */
		for (var i in A_edges) {
			if (!A_edges.hasOwnProperty(i)) continue;
			i = A_edges[i];

			// Check GraphId
			if (!i.hasAttribute('GraphId')) {
				var u = i.getElementsByTagName('BiopaxRef');
				if (u.length) {
					i.setAttribute('GraphId', u.textContent);
				} else {
					Lerror("Interaction with NO GraphId found");
					console.log(i);
					continue;
				}
			}
			// Should have 2 <Point> and all of them have GraphRef
			var I = i.getElementsByTagName("Point");
			if (I.length != 2) {
				Lerror("Interaction non-2 <Point> tags found");
				console.log(i);
				continue;
			}
			var H_from = xml.getElementById(I[0].getAttribute('GraphRef'));
			var H_to   = xml.getElementById(I[1].getAttribute('GraphRef'));
			if (!H_from || !H_to) {
				Lerror("Interaction from/to elements not found");
				console.log(i);
				continue;
			}
			i.from = H_from;
			i.to   = H_to;
			
			/* If this <DataNode> does not contain, log them */
			if (!(I = i.get({id:'GraphId'}))) continue;
			
			/* Add to <DataNode> */
			for (var j in I) if (I.hasOwnProperty(j)) i[j] = I[j];
			A_ret.push(i);
		}
		return A_ret;
	}
	this.F_init = this.B_biopax3 ? this.bp3initialize : function() {
		var _ = this;
		var xml = this.xml();
		// Collect ids
		_.A_entry = [];
		["Label", "DataNode", "Anchor", "Group"].forEach(function(i) {
			var I = xml.getElementsByTagName(i);
			for (var j=0 ; j<I.length ; j++) {
				var J = I[j];
				if (!(K = J.get({id:'GraphId'},['TextLabel']))) continue;
				/* Add to the node */
				for (var k in K) if (K.hasOwnProperty(k)) J[k] = K[k];
				_.A_entry.push(J);
			}
		});
	}
	this.F_initEntry = this.B_biopax3 ? this.bp3initEntries : function() {
		var _ = this;
		
		/* For each <Anchor> */
		var A_anchors = this.xml().getElementsByTagName('Anchor');
		var	N_anchor = 0;
		for (var i in A_anchors) {
			if (!A_anchors.hasOwnProperty(i)) continue;
			i = A_anchors[i];
			var gidParent = i.parentNode.parentNode.getAttribute('GraphId');
			
			i.symbol		= '<<<ANCHOR>>>';
			i.id			= i.getAttribute('GraphId');
			i.type			= 'anchor';
			i.name			= '<<<ANCHOR'+(++N_anchor)+'>>>';
			this.A_entry[i.id]	= i;
		}
		
		this.A_nodes.forEach(function(I) {
			/* If belongs to group, add this GraphId to group's GraphId */
			if (undefined !== I.GroupRef) {
				var gidgrp = _.A_grp2gph[I.GroupRef];
				if (undefined === _.A_grp2mem[gidgrp]) _.A_grp2mem[gidgrp] = [];
				_.A_grp2mem[gidgrp].push(I.id);
			}
			
			switch (I.type) {
			case 'Pathway':		I.type	= 'map';		break;
			case 'GeneProduct':	I.type	= 'gene';		break;
			case 'Metabolite':	I.type	= 'compound';	break;
			default:									break;
			}

			/* For <DataType Type=''> */
			switch (I.type) {
			case 'gene': {
					/* Expects <Xref> */
					var ref = I.getElementsByTagName("Xref");
					var tmp = [];
					for (var j in ref) {
						if (!ref.hasOwnProperty(j)) continue;
						j = ref[j];
						var _db = j.getAttribute('Database');
						var _id = j.getAttribute('ID');
						if (_db.length === 0) continue;
						if (!_db || !_id || _db === undefined || _id === undefined) {
							Lwarn("Unknown GeneProduct Xref ["+I.name+"] found, database ["+_db+"] id ["+_id+"]");
							tmp = [];
							break;
						}
						tmp.push({
							database: _db,
							id: _id
						});
					}
					I.gene = tmp;
					I.symbol = [ I.TextLabel ];
				} break;
			case 'map': {
					/* Expects <Xref> */
					var ref = I.getElementsByTagName("Xref");
					var tmp = [];
					for (var j in ref) {
						if (!ref.hasOwnProperty(j)) continue;
						j = ref[j];
						var _db = j.getAttribute('Database');
						var _id = j.getAttribute('ID');
						if (_db.length === 0) continue;
						if (!_db || !_id || _db === undefined || _id === undefined) {
							Lwarn("Unknown Pathway Xref ["+I.name+"] found, database ["+_db+"] id ["+_id+"]");
							tmp = [];
							break;
						}
						tmp.push({
							database: _db,
							id: _id
						});
					}
					I.link = tmp;
				} break;
			case 'compound': {
					/* Expects <Xref> */
					var ref = I.getElementsByTagName("Xref");
					var tmp = [];
					for (var j in ref) {
						if (!ref.hasOwnProperty(j)) continue;
						j = ref[j];
						var _db = j.getAttribute('Database');
						var _id = j.getAttribute('ID');
						if (!_db || !_id || _db === undefined || _id === undefined) {
							console.log("Unknown Metabolite Xref "+I.name+" found");
							tmp = [];
							break;
						}
						tmp.push({
							database: _db,
							id: _id
						});
					}
					I.compound = tmp;
				} break;
			default:
				Lcmt("Name:" + I.name + ", Type:" + I.type);
				break;
			}
			// temp
			I.symbol = [ I.name ];

			/* Insert to A_entry */
			_.A_entry[I.id] = I;
		});
		
		/* For each <Label> */
		var A_labels = this.xml().getElementsByTagName('Label');
		for (var i in A_labels) {
			if (!A_labels.hasOwnProperty(i)) continue;
			i = A_labels[i];

			/* If this <DataNode> does not contain, log them */
			if (!(I = i.get(['TextLabel', 'GraphId']))) continue;
			Ldebug("Label ["+I.GraphId+"="+I.TextLabel+"] retrieved");
			
			i.symbol	= [ I.TextLabel ];
			i.compound	= I.TextLabel;
			i.name		= I.TextLabel;
			i.id		= I.GraphId;
			i.type		= 'compound';

			/* Insert to A_entry */
			this.A_entry[I.GraphId] = i;				
		}
	};
	this.F_preprocess = this.B_biopax3 ? this.bp3preprocess : function(xml) {
		var groups = xml.getElementsByTagName('Group');
		
		/* For each group */
		for (var i in groups) {
			if (!groups.hasOwnProperty(i)) continue;
			i = groups[i];
			
			if (!(I = i.get(['GroupId', 'GraphId']))) continue;

			i.id		= I.GroupId;
			i.symbol	= [ i.name = 'Group ['+I.GroupId+']' ];
			i.type		= 'group';
			
			/* Insert to A_entry */
			this.A_entry[I.GraphId] = i;
			
			/* A_grp2gph */
			this.A_grp2gph[I.GroupId] = I.GraphId;
		}		
	}
		
	return this.init(S_pwayID);
};
wikipathwayProcessor.prototype = new pathwayProcessor();
wikipathwayProcessor.prototype.constructor = wikipathwayProcessor;
