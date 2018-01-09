HTMLCollection.prototype.forEach = function(_f) {
	for (var i=0 ; i<this.length ; i++)
		_f(this.item(i));
};

wikipathwayProcessor = function(S_pwayID) {
	pathwayProcessor.call(this, S_pwayID);
	Ldebug('wikipathwayProcessor called');

	this.B_biopax3	= true;
	this.S_type		= 'WP';
	this.F_url		= function(id) {
		return 'https://www.wikipathways.org/wpi/wpi.php?action=downloadFile' +
					'&type='+(this.B_biopax3?'owl':'gpml')+'&pwTitle=Pathway:'+id;
	};
	this.F_getDesc = this.B_biopax3 ? this.bp3getPathwayDesc : function(xml) {
	};
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
		this.A_node = [];
		
		var A_ref = {};
		this.A_edge2.forEach(function(i) {
			// Set reference count
			if (A_ref[i.from] === undefined) A_ref[i.from] = 0;
			if (A_ref[i.to] === undefined) A_ref[i.to] = 0;
			A_ref[i.from]++;
			A_ref[i.to]++;
		});
		
		for (var i in this.A_entry) if (this.A_entry.hasOwnProperty(i)) {
			var I = this.A_entry[i];
			switch (I.tagName) {
			case 'Label':
				// Should have at least one ref
				if (A_ref[i.id]) this.A_node.push(I);
				break;
			default:
				this.A_node.push(I);
				break;
			}
		}
		return this.A_node;
	};
	this.F_getEdge	= this.B_biopax3 ? this.bp3getEdges : function(xml) {
		var _ = this;
		var A_ret = [];
		this.A_edge2.forEach(function(i) {
			// Check from/to in A_entry
			var H_from = _.A_entry[i.from] ? _.A_entry[i.from] : _.A_snodeMap[i.from];
			var H_to = _.A_entry[i.to] ? _.A_entry[i.to] : _.A_snodeMap[i.to];
			if (!H_from || !H_to) {
				Lerror("Interaction from/to elements not found");
				console.log(i);
				return;
			}
			switch (H_from.tagName) {
			case 'DataNode': case 'Label': case 'Group': case 'Anchor': case 'IVIP-NODE': break;
			default:
				Lerror("Non-allowed fromNode found");
				console.log(H_from);
				return;
			}
			switch (H_to.tagName) {
			case 'DataNode': case 'Label': case 'Group': case 'Anchor': case 'IVIP-NODE': break;
			default:
				Lerror("Non-allowed fromNode found");
				console.log(H_from);
				return;
			}
			A_ret.push({
				from:H_from,
				to:H_to,
			});
		});
		// Remove <Label> nodes with ref == 0
		
		return A_ret;
	}
	this.F_init = this.B_biopax3 ? this.bp3initialize : function() {
		var _ = this;
		var xml = this.xml();
		// Collect ids
		_.A_entry = [];
		_.A_snodeMap = {};
		_.N_idSuper = 1;
		// Map basic properties
		var ids = ["Label", "DataNode", "Anchor", "Group"];
		ids.forEach(function(i) {
			xml.getElementsByTagName(i).forEach(function(J) {
				if (!(K = J.get({id:'GraphId'},['TextLabel','GroupRef','GroupId','Type']))) return;
				/* Add to the node */
				for (var k in K) if (K.hasOwnProperty(k)) J[k] = K[k];
				if (i != "Group") _.A_entry[J.id] = J;
			});
		});
		// Create supernodes
		xml.getElementsByTagName("Group").forEach(function(i) {
			var tmp = document.createElement("ivip-node");
			tmp.id = 'ivipSuperNode'+_.getSuperNodeId();
			tmp.origin = i;
			tmp.type = 'cpx';
			// Search nodes with its GroupRef == i.GroupId
			var mem = [];
			_.A_entry.forEach(function(j) {
				if (j.GroupRef && j.GroupRef == i.GroupId) mem.push(j);
			});
			tmp.member = mem;
			_.A_entry[tmp.id] = tmp;
			_.A_snodeMap[i.id] = tmp;
		});
		/* For each <Interaction> */
		this.A_edge2 = [];
		xml.getElementsByTagName('Interaction').forEach(function(i) {
			// Check GraphId
			if (!i.hasAttribute('GraphId')) {
				var u = i.getElementsByTagName('BiopaxRef');
				if (u.length) {
					i.setAttribute('GraphId', u.textContent);
				} else {
					Lerror("Interaction with NO GraphId found");
					console.log(i);
					return;
				}
			}
			// Should have 2 <Point> and all of them have GraphRef
			var I = i.getElementsByTagName("Point");
			if (I.length < 2) {
				Lerror("Interaction non-2 <Point> tags found");
				console.log(i);
				return;
			}
			/* If this <Interaction> does not contain, log them */
			if (!(J = i.get({id:'GraphId'}))) return;			
			/* Add to <Interaction> */
			for (var j in J) if (J.hasOwnProperty(j)) i[j] = J[j];

			// If <Anchor> have GraphId
			var H_anchor = i.getElementsByTagName("Anchor");
			if (H_anchor.length == 1) {
				var j = H_anchor[0].getAttribute("GraphId");
				i.from = I[0].getAttribute('GraphRef');
				i.to = j;
				_.A_edge2.push(i);
				j.type = 'bcr';
				_.A_edge2.push({
					from: j,
					to: I[I.length-1].getAttribute('GraphRef'),
				});
			} else if (H_anchor.length > 1) {
				Lerror("Multiple anchors found");
				console.log(i);
				return;
			} else {
				i.from = I[0].getAttribute('GraphRef');
				i.to   = I[I.length-1].getAttribute('GraphRef');				
				_.A_edge2.push(i);
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
			switch (I.Type) {
			case 'Pathway':		I.type	= 'map';		break;
			case 'GeneProduct':	I.type	= 'gene';		break;
			case 'Metabolite':	I.type	= 'compound';	break;
			default:									break;
			}

			/* For <DataType Type=''> */
			I.symbol = [ I.TextLabel ];
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
	}
		
	return this.init(S_pwayID);
};
wikipathwayProcessor.prototype = new pathwayProcessor();
wikipathwayProcessor.prototype.constructor = wikipathwayProcessor;
wikipathwayProcessor.prototype.getSuperNodeId = function() {
//	Lnotice("Supernode ["+this.N_idSuper+"] requested");
	return this.N_idSuper++;
};

