/*
 * FUNCTIONS FOR ELEMENTARY BEHAVIORS
 */

var objectJoin = function(o, concat) {
	var u = [];
	Object.keys(o).forEach(function(I) {
		u.push(I+'='+o[I]); });
	return u.join(concat);
};

/**
 * @author		Sungyoung Lee
 * @date		160623
 * @remark		BioPAX 3 compatible
 * @brief		Fetch 'canonical' name of BioPAX 3 entity,
 *				by searching <bp:standardName> first and then
 *				searching <bp:displayName> next if the former is not exists.
 * @param[in]	H_obj An {Element} object to get the name
 * @return		{null} if there is no available name
 * @return		{String} if the name has found
 */
pathwayProcessor.prototype.bp3getName = function(H_obj) {
	/* Seek bp:standardName first */
	var S_name = H_obj.getChildTextNS(this.bp, 'standardName');
	if (!S_name)
		S_name = H_obj.getChildTextNS(this.bp, 'displayName');
	return !S_name ? null : S_name;	
};

pathwayProcessor.prototype.bp3getResource = function(H_obj) {
	var r = H_obj.getAttributeNS(this.rdf, 'resource');
	return !r ? null : (r.charAt(0) == '#' ? r.substring(1) : r);
};

// xref ID -> db/id
var A_need2anno = {};

function dump_sub(_, e, lv, B_retString) {
	if (undefined === B_retString) B_retString = false;
	
	var F_1 = function(v){if(v.length!=1)throw v[0].parentElement;};
	var F_text = function(v){F_1(v);return v[0].textContent;};
	var F_textN = function(v){var t=[];v.forEach(function(I){t.push(I.textContent);});return t.join(" ||| ");};
	var F_resource = function(v){F_1(v);
		var x = _.bp3getResource(v[0]);
		return x ? x : v[0].children[0].id; };
	var F_resourceN = function(v){var t=[];v.forEach(function(I){
		var x = _.bp3getResource(I); 
		t.push(x ? x : I.children[0].id);});return t.join(" ||| ");};
	var F_xrefN = function(v){var t=[];v.forEach(function(I){
		var x = _.bp3getResource(I);
		t.push(dump_sub(_, x ? _.A_bp3entry[x] : I.children[0], 0, true));
		//t.push(_.A_bp3entry[r].tagName+'['+r+']');		
	});return t.join(" ||| ");};
	var F_xref = function(v){F_1(v);
		var x = _.bp3getResource(v[0]);
		return dump_sub(_, x ? _.A_bp3entry[x] : v[0].children[0], 0, true);};
	var A_tagInfo = {
		'bp:BiochemicalPathwayStep': {
			print: '[PWAY] [BIOCHEMPSTEP]',
			expect: {'bp:stepConversion':F_resource,},
			optional: {
				'bp:stepProcess':F_resourceN,
				'bp:nextStep':F_resourceN,
				'bp:stepDirection':F_text, }, },
		'bp:BiochemicalReaction': {
			print: '[FUNC] [BIOCHEMREACT]', expect: {},
			optional: {
				'bp:left':F_resourceN,
				'bp:right':F_resourceN,
				'bp:dataSource':F_text,
				'bp:deltaG':F_resource,
				'bp:displayName':F_text,
				'bp:standardName':F_text,
				'bp:name':F_textN,
				'bp:eCNumber':F_textN,
				'bp:comment':F_textN,
				'bp:spontaneous':F_text,
				'bp:participantStoichiometry':F_resourceN,
				'bp:conversionDirection':F_text,
				'bp:xref':F_xrefN}, },
		'bp:BioSource': {
			print: '[????] [BIOSOURCE   ]',
			returnPrint: '[BIOS]', expect: {
				'bp:xref':F_xref, },
			optional: {
				'bp:standardName':F_text,
				'bp:displayName':F_text,
				'bp:cellType':F_resource,
				'bp:name':F_text,
				'bp:tissue':F_resource, },
			},
		'bp:Catalysis': {
			print: '[FUNC] [CATALYSIS   ]', expect: {'bp:controlled':F_resource},
			optional: {
				'bp:cofactor':F_resourceN,
				'bp:controller':F_resourceN,
				'bp:controlType':F_text,
				'bp:comment':F_textN,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:name':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xref, }, },
		'bp:CellularLocationVocabulary': {
			print: '[ REF] [CELLLOCAVOCA]', expect: {'bp:term':F_text,'bp:xref':F_xref}, },
		'bp:CellVocabulary': {
			print: '[ REF] [CELLVOCABULA]',
			returnPrint: '[CVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xref},
			returnOnly: true, },
		'bp:ChemicalStructure': {
			print: '[ REF] [CHEMSTRUCTUR]',
			returnOnly: true, expect: {
					'bp:structureFormat':F_text,
					'bp:structureData':F_text
				},
			},
		'bp:Complex': {
			print: '[FUNC] [COMPLEX     ]', expect: {},
			optional: {
				'bp:cellularLocation':F_text,
				'bp:comment':F_textN,
				'bp:componentStoichiometry':F_resourceN,
				'bp:component':F_resourceN,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, }, },
		'bp:ComplexAssembly': {
			print: '[FUNC] [COMPLEXASSEM]', expect: {'bp:left':F_resource,'bp:right':F_resource},
			optional: {'bp:comment':F_textN,'bp:xref':F_xrefN,
				'bp:displayName':F_text,'bp:standardName':F_text,}, },
		'bp:Control': {
			print: '[FUNC] [CONTROL     ]', expect: {'bp:controller':F_resource,'bp:controlled':F_resource},
			optional: {'bp:comment':F_textN, 'bp:displayName':F_text, 'bp:standardName':F_text,
				'bp:xref':F_xrefN,'bp:controlType':F_text}, },
		'bp:DeltaG': {
			print: '[????] [DELTAG      ]', expect: {'bp:deltaGPrime0':F_text, }, },
		'bp:Evidence': {
			print: '[????] [EVIDENCE    ]',
			expect: {},
			optional: {
				'bp:evidenceCode':F_resource,
				'bp:xref':F_xref, }, },
		'bp:EvidenceCodeVocabulary': {
			print: '[ REF] [EVIDCODEVOCA]',
			returnPrint: '[EVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xref},
			returnOnly: true, },
		'bp:Interaction': {
			print: '[????] [INTERACTION ]', expect: {
				'bp:displayName':F_text,
				'bp:name':F_textN,
				'bp:participant':F_resourceN, }, },
		'bp:Modulation': {
			print: '[????] [MODULATION  ]', expect: {
				'bp:controlled':F_resource,
				'bp:controller':F_resource,
				'bp:xref':F_xref, },
			optional: { 'bp:controlType':F_text, }, },
		'bp:Pathway': {
			print: '[PWAY]', expect: {},
			optional:{
				'bp:comment':F_textN,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resource,
				'bp:name':F_text,
				'bp:organism':F_text,
				'bp:pathwayComponent':F_xrefN,
				'bp:pathwayOrder':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN}, },
		'bp:PathwayStep': {
			print: '[PWAY] [STEP        ]',
			expect: { 'bp:stepProcess':F_resource },
			},
		'bp:Protein': {
			print: '[FUNC] [PROTEIN     ]', expect: {},
			optional: {
				'bp:cellularLocation':F_text,
				'bp:comment':F_textN,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:entityReference':F_xref,
				'bp:standardName':F_text,
				'bp:memberPhysicalEntity':F_textN,
				'bp:name':F_textN,
				'bp:xref':F_xrefN, }, },
		'bp:ProteinReference': {
			print: '[ REF] [PROTEIN     ]',
			returnPrint: '[RPRT]',
			expect: {},
			optional: {
				'bp:organism':F_resource,
				'bp:cellularLocation':F_text,
				'bp:comment':F_text,
				'bp:standardName':F_text,
				'bp:displayName':F_text,
				'bp:name':F_textN,
				'bp:xref':F_xrefN
			}, returnOnly: true, },
		'bp:Provenance': {
			print: '[????] [PROVENANCE  ]',
			returnPrint: '[PROV]', expect: {},
			optional: {
				'bp:displayName':F_text,
				'bp:name':F_text,
				'bp:standardName':F_text,
				'bp:comment':F_text, }, },
		'bp:PublicationXref': {
			print: '[XREF] [PUBLICATION ]',
			returnPrint: '[XPUB]',
			expect: {'bp:db':F_text,'bp:id':F_text},
			optional: {'bp:year':F_text,'bp:author':F_textN,'bp:source':F_text,'bp:title':F_text},
			returnOnly: true, needAnnotate: true, },
		'bp:RelationshipXref': {
			print: '[XREF] [RELATIONSHIP]',
			returnPrint: '[XREL]',
			expect: {'bp:db':F_text,'bp:id':F_text},
			optional: {'bp:relationshipType':F_resource},
			returnOnly: true, needAnnotate: true, },
		'bp:RelationshipTypeVocabulary': {
			print: '[ REF] [RELATYPEVOCA]',
			returnPrint: '[RVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xref},
			returnOnly: true, },
		'bp:Rna': {
			print: '[FUNC] [RNA         ]',
			expect: {
				'bp:displayName':F_text,
				'bp:entityReference':F_xref,
				'bp:cellularLocation':F_resource, }, },
		'bp:RnaReference': {
			print: '[ REF] [RNA         ]',
			returnPrint: '[RRNA]',
			expect: { 'bp:xref':F_xref, 'bp:organism':F_resource,
				'bp:displayName':F_text, },
			optional: {},
			returnOnly:true, },
		'bp:SmallMolecule': {
			print: '[FUNC] [SMALLMOLCULE]', expect: {},
			optional: {
				'bp:displayName':F_text,
				'bp:dataSource':F_text,
				'bp:standardName':F_text,
				'bp:entityReference':F_xref,
				'bp:comment':F_text,
				'bp:name':F_textN,
				'bp:xref':F_xrefN,
				'bp:cellularLocation':F_text,
				'bp:comment':F_textN}, },
		'bp:SmallMoleculeReference': {
			print: '[ REF] [SMALLMOLCULE]',
			returnPrint: '[RMOL]',
			expect: {},
			optional: {
				'bp:chemicalFormula':F_text,
				'bp:comment':F_text,
				'bp:displayName':F_text,
				'bp:memberEntityReference':F_resource,
				'bp:molecularWeight':F_text,
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:structure':F_resource, 
				'bp:xref':F_xrefN, },
			returnOnly: true, },
		'bp:Stoichiometry': {
			print: '[????] [STOICHIOMTRY]',
			expect: {
				'bp:physicalEntity':F_resource,
				'bp:stoichiometricCoefficient':F_text, },
			optional: { 'bp:deltaG':F_resource, }, },
		'bp:TissueVocabulary': {
			print: '[ REF] [TISSUEVOCA  ]', expect: {'bp:term':F_text,'bp:xref':F_xref}, },
		'bp:Transport': {
				print: '[FUNC] [TRANSPORT]', expect: {'bp:left':F_resourceN,'bp:right':F_resourceN,},
				optional: {
					'bp:displayName':F_text,
					'bp:standardName':F_text,
					'bp:xref':F_xrefN,
					'bp:spontaneous':F_text,
					'bp:participantStoichiometry':F_resourceN,
					'bp:comment':F_textN,
					'bp:conversionDirection':F_text,
					'bp:name':F_text,
				},
			},
		'bp:UnificationXref': {
			print: '[XREF] [UNIFICATION ]',
			returnPrint: '[XUNI]',
			expect: {'bp:db':F_text,'bp:id':F_text},
			optional: {'bp:comment':F_text,'bp:idVersion':F_text},
			returnOnly: true, needAnnotate: true, },
	};
	if (undefined === lv) lv = 0;
	var str = '   '.repeat(lv);
	switch (e.tagName) {
		// Undetermined
	case 'bp:BioSource':
	case 'bp:Provenance':
	case 'bp:ChemicalStructure':
	case 'bp:Interaction':
	case 'bp:Evidence':
	case 'bp:Modulation':
	case 'bp:DeltaG':
	
	case 'bp:Pathway':
	case 'bp:PathwayStep':
	case 'bp:BiochemicalPathwayStep':
	
	case 'bp:BiochemicalReaction':
	case 'bp:Transport':
	case 'bp:ComplexAssembly':
	case 'bp:Control':
	case 'bp:Stoichiometry':

	case 'bp:Protein':
	case 'bp:Catalysis':
	case 'bp:SmallMolecule':
	case 'bp:Complex':
	case 'bp:Rna':
	case 'bp:CellularLocationVocabulary':
	case 'bp:TissueVocabulary':
	case 'bp:EvidenceCodeVocabulary':
	case 'bp:RelationshipTypeVocabulary':
	
	case 'bp:SmallMoleculeReference':
	case 'bp:ProteinReference':
	case 'bp:RnaReference':
	case 'bp:CellVocabulary':
	
	case 'bp:UnificationXref':
	case 'bp:PublicationXref':
	case 'bp:RelationshipXref':
		var T = A_tagInfo[e.tagName];
		// Make an array of child tag names
		// Cache childs by their tag name
		var tmp = [];
		var childs = [];
		for (var j=0 ; j<e.children.length ; j++) {
			if (childs[e.children[j].tagName] === undefined) childs[e.children[j].tagName] = [];
			childs[e.children[j].tagName].push(e.children[j]);
			tmp.push(e.children[j].tagName);
		}
		// Remove optional childs from the collected array
		if (T.optional !== undefined) {
			var O = Object.keys(T.optional);
			tmp = tmp.filter(function(I) { return O.indexOf(I) == -1; });
		}
		
		// Child composition must be same
		if (Array.from(new Set(tmp)).sort().toString() != Object.keys(T.expect).sort().toString()) {
			var ret = str+' --> [ERR] '+(B_retString&&T.returnPrint?T.returnPrint:T.print)+' ['+e.id+']';
			if (B_retString) return ret;
			console.log(ret);
			// Otherwise just print its children
			for (var j=0 ; j<e.children.length ; j++) dump_sub(_, e.children[j], lv+1);
		} else {
			// Information match, extract information
			tmp = {};
			Object.keys(T.expect).forEach(function(I) {
				tmp[I.split(':').pop()] = T.expect[I](childs[I]);
			});
			
			// Extract 'optional' information if needed
			if (T.optional !== undefined) Object.keys(T.optional).forEach(function(I) {
				if (childs[I] && childs[I].length)
					tmp[I.split(':').pop()] = T.optional[I](childs[I]);
			});
			var ret = str+(B_retString&&T.returnPrint?T.returnPrint:T.print)+' ['+e.id+'] -> ' + objectJoin(tmp, ',');
			if (B_retString) return ret;
			// Do not print if returnOnly
			if (undefined === T.returnOnly || !T.returnOnly)
				console.log(ret);
			// Add this entry to A_need2anno if needAnnotate == true
			if (undefined !== T.needAnnotate && T.needAnnotate)
				A_need2anno[e.id] = tmp;
		}
		break;
	default:
		var ret = ' --> [???] '+str+e.tagName+'['+e.id+']';
		if (B_retString) return ret;
		console.log(ret);
		for (var j=0 ; j<e.children.length ; j++)
			dump_sub(_, e.children[j], lv+1);
		break;
	}
}

pathwayProcessor.prototype.bp3initialize = function(xml) {
	// Initialize A_bp3entry
	this.A_bp3entry	= {};
	this.A_bp3tag	= {};

	// Grab all elements
	var A_get = xml.getElementsByTagNameNS(this.bp, "*");
	for (var j=0 ; j<A_get.length ; j++) {
		var J = A_get[j];
		if (undefined === this.A_bp3tag[J.tagName]) this.A_bp3tag[J.tagName] = [];
		this.A_bp3tag[J.tagName].push(J);
		
		var _i = J.getAttributeNS(this.rdf, 'ID');
		if (!_i) {
			_i = J.getAttributeNS(this.rdf, 'about');
			if (!_i) {
				Ldebug('['+this.A_bp3tag[J.tagName].length+']th element of tag ['+J.tagName+'] has neither rdf:ID or rdf:about');
				continue;
			}
		}
		A_get[j].id = _i;
		this.A_bp3entry[_i] = A_get[j];
	}
	var o = this.A_bp3entry;
	for (var i in o) if (o.hasOwnProperty(i)) dump_sub(this, o[i]);
	
	// Now I have all elements
}

/**
 * @author		Sungyoung Lee
 * @date		160618
 * @remark		BioPAX 3 compatible
 * @brief		Fetch 'target' entries with the given NS and localName
 *				According to BioPAX 3 standard, it automatically
 *				follows/caches the {Element}s to search,
 *				by following rdf:resource or searching the childNodes
 * @param[in]	H_obj	An {Element} object to get the name
 * @param[in]	S_ns	A namespace to match
 * @param[in]	S_name	A localName to match
 * @return		{Array} of {Element}s found
 */
pathwayProcessor.prototype.bp3getData = function(H_obj, S_ns, S_name) {
	/* Get child {Element}s by the given NS and localName */
	var A_elem	= H_obj.getChildsByTagNameNS(S_ns, S_name);
	/* For each child, invoke the sub-search function and vectorize the returns */
	var A_ret	= [];
	for (var i=0 ; i<A_elem.length ; i++)
		this.bp3getDatum(A_elem[i]).forEach(function(v) { A_ret.push(v); });
	/* OK */
	return A_ret;
};

pathwayProcessor.prototype.bp3getDatum = function(H_obj, S_tagName) {
	// Have resource?
	var tgt = [];
	var res = H_obj.getAttributeNS(this.rdf, 'resource');
	if (res) {
		/* Have resource = returns an entity */
		var _id = res.charAt(0) == '#' ? res.substring(1) : res;
		var _tag = _id.replace(/[0-9]+/, "");
		/* Cached? */
		if (undefined === this.A_bp3entry[_id]) this.bp3cacheElementsByTagNames([_tag]);
		/* Not cached yet? then it does not exists */
		if (undefined === this.A_bp3entry[_id]) {
			Lerror('Entity ['+_id+'] does not exists in the file');
			return [];
		}
		/* Matches tagName? */
		var tmp = this.A_bp3entry[_id];
		if (undefined !== S_tagName && tmp.tagName != S_tagName) {
			Lerror('Entity ['+_id+'] expected ['+S_tagName+'] but is ['+tmp.tagName+']');
			return [];
		}
		/* OK */
		tgt.push(tmp);
	} else {
		/* In this case, the entity/entities is/are directly defined below the tag */
		this.bp3cacheElementsByChilds(H_obj);
		for (var i=0 ; i<H_obj.childNodes.length ; i++) {
			var I = H_obj.childNodes[i];
			if (undefined === I.tagName || !I.tagName) continue;
			if (I.namespaceURI != this.bp) continue;
			
			var _id = I.getAttributeNS(this.rdf, 'ID');
			/* Not cached yet? then it does not exists */
			if (undefined === this.A_bp3entry[_id]) {
				Lerror('SYSERR: Entity ['+_id+'] was not cached');
				continue;
			}
			/* Matches tagName? */
			var tmp = this.A_bp3entry[_id];
			if (undefined !== S_tagName && tmp.tagName != S_tagName) continue;
			/* OK */
			tgt.push(tmp);
		}
	}
	return tgt;
};

/**
 * @author			Sungyoung Lee
 * @date			160619
 * @remark			BioPAX 3 compatible
 * @remark			the identifier that was not cached will not converted
 * @brief			Converts array/object of the identifiers into the cached object
 * @param[in/out]	{Argument} Mixture of array/object contains "id"s to convert into Element
 * @return			Nothing but the "arguments" will be converted internally
 */
pathwayProcessor.prototype.bp3convertID2element = function() {
	var _ = this;
	for (var i=0 ; i<arguments.length ; i++) {
		var cur = arguments[i];
		if (cur instanceof Array) for (var j=0 ; j<cur.length ; j++)
			if (typeof cur[j] == 'string') {
				var id = cur[j].charAt(0) == '#' ? cur[j].substring(1) : cur[j];
				/* Allocate object if cached */
				if (undefined !== _.A_bp3entry[id])
					cur[j] = _.A_bp3entry[id];
				else {
					var tmp = _.bp3interpretNonElemAnno(id);
					if (tmp === undefined)
						Lwarn("["+id+"] has failed to convert");
					cur[j] = tmp;
				}
			}
		else if (cur instanceof Object) for (var j in cur) {
			if (cur.hasOwnProperty(j) && typeof cur[j] == 'string') {
				var id = cur[j].charAt(0) == '#' ? cur[j].substring(1) : cur[j];
				/* Allocate object if cached */
				if (undefined !== _.A_bp3entry[id])
					cur[j] = _.A_bp3entry[id];
				else {
					var tmp = _.bp3interpretNonElemAnno(id);
					if (tmp === undefined)
						Lwarn("["+id+"] has failed to convert");
					cur[j] = tmp;
				}
			}
		}
	}
}

/**
 * @author		Sungyoung Lee
 * @date		171201
 * @remark		BioPAX 3 compatible
 * @brief		Interpret non-element type annotation (which is created by this script) into translatable form
 * @param[in]	{Argument} (Presumably) string which is an ID to interpret
 * @return		{Array} Interpretation result
 */
pathwayProcessor.prototype.bp3interpretNonElemAnno = function(id) {
	if (id.indexOf(':') != -1) {
		var db = id.split(':').shift();
		var ret = id;
		switch (db) {
		case 'text':
			break;
		case 'PubMed':
			break;
		default:
			Lwarn('['+db+'] annotation is not addressed');
			break;
		}
		return ret;
	} else return undefined;
}

/**
 * @author		Sungyoung Lee
 * @date		160619
 * @remark		BioPAX 3 compatible
 * @brief		Extracts tags from the rdf:ID or rdf:about attributes
 * @param[in]	{Argument} Mixture of array/object contains rdf:ID or rdf:about
 * @return		{Array} Extracted tags
 */
pathwayProcessor.prototype.bp3extractTagsFromArray = function() {
	var tags = {};
	var F_proc = function(i) {
		if (i.charAt(0) == '#') i = i.substring(1);
		tags[i.replace(/[0-9]+/, "")] = true;
	};
	for (var i=0 ; i<arguments.length ; i++) {
		var A_obj = arguments[i];
		
		if (A_obj instanceof Array) A_obj.forEach(F_proc);
		else for (var i in A_obj) if (A_obj.hasOwnProperty(i)) F_proc(i);
	}
	return Object.keys(tags);
};

/**
 * BioPAX 3 compatible
 * Get all elements by tagname and namespace
 * @argument {Variable} Tag list qualified by BP namespace
 * @return Array of Element objects whose tag matches to the input
 */
pathwayProcessor.prototype.bp3getElementsByTagNames = function() {
	var A_ret = [];
	var A_tag = [];
	for (var i=0 ; i<arguments.length ; i++) A_tag.push(arguments[i]);
	/* Cache if not cached */
	this.bp3cacheElementsByTagNames(A_tag);
	/* Return them */
	for (var i=0 ; i<arguments.length ; i++) {
		if (undefined === this.A_bp3tag[arguments[i]]) {
			Lcmt('Tag ['+arguments[i]+'] has not cached, maybe not exists?');
			for (var j in this.A_bp3tag) if (this.A_bp3tag.hasOwnProperty(j))
				Lcmt('    ['+j+'] cached');
			continue;
		}
		this.A_bp3tag[arguments[i]].forEach(function(v) { A_ret.push(v); });
	}
	return A_ret;
};

/**
 * BioPAX 3 compatible
 * Cache XML elements by tag names
 * @argument {Array} A_tag A list of tags, "bp" namespace is assumed
 * @return Nothing but this.A_bp3entry caches the information
 */
pathwayProcessor.prototype.bp3cacheElementsByTagNames = function(A_tag) {
	var _		= this;
	var xml		= this.xml();
	var N_anno	= 0;
	var F_procTag = function(v) {
		// Do nothing if already cached
		if (undefined !== _.A_bp3tag[v] ||
			_.B_bp3allChecked && v != "XXXXXX") return;
		_.A_bp3tag[v] = [];
		
		// Get elements and store them by their rdf:ID
		var A_get = xml.getElementsByTagNameNS(_.bp, v);
		if (A_get.length == 0) {
			_.B_bp3allChecked = true;
			A_get = xml.getElementsByTagNameNS(_.bp, "*");
		}
		N_anno = 0;
		for (var j=0 ; j<A_get.length ; j++) {
			var _i = A_get[j].getAttributeNS(_.rdf, 'ID');
			if (!_i) {
				_i = A_get[j].getAttributeNS(_.rdf, 'about');
				if (!_i) {
					if (_.B_bp3allChecked) continue;
					Lwarn('['+j+'] th element of tag ['+v+'] has neither rdf:ID or rdf:about');
					continue;
				}
			}
			A_get[j].id = _i;
			N_anno++;
			if (_.B_bp3allChecked) {
				if (undefined === _.A_bp3tag[A_get[j].localName]) _.A_bp3tag[A_get[j].localName] = [];
				_.A_bp3tag[A_get[j].localName].push(A_get[j]);
			} else
				_.A_bp3tag[v].push(A_get[j]);
			_.A_bp3entry[_i] = A_get[j];
		}
		Lcmt('['+N_anno+'/'+A_get.length+'] elements cached/found by tag ['+(_.B_bp3allChecked?'ALL':v)+']');		
	};
	// Initialize A_bp3entry if not exists
	if (undefined === _.A_bp3entry)	_.A_bp3entry	= {};
	if (undefined === _.A_bp3tag)	_.A_bp3tag		= {};
	// For each tag
	if (A_tag instanceof Array) A_tag.forEach(F_procTag);
	else for (var v in A_tag) if (A_tag.hasOwnProperty(v))
		F_procTag(v);

	if (N_anno == 0 && A_tag[0] != 'XXXXXX') this.bp3cacheElementsByTagNames(["XXXXXX"]);
};
pathwayProcessor.prototype.bp3cacheElementsByChilds = function(H_obj) {
	var xml = this.xml();
	// Gather tags
	var A_tag = {};
	for (var i=0 ; i<H_obj.childNodes.length ; i++) {
		var I = H_obj.childNodes[i];
		if (undefined === I.tagName || !I.tagName) continue;
		if (I.namespaceURI != this.bp) continue;
		A_tag[I.localName] = true;
	}
	this.bp3cacheElementsByTagNames(A_tag);
};
/**
 * BioPAX 3 compatible
 * Grab all rdf:resource for given tags
 */
pathwayProcessor.prototype.bp3getResourcesByElement = function(A_elem) {
	var ret = {};
	for (var i=0 ; i<A_elem.length ; i++) {
		var res = A_elem[i].getAttributeNS(this.rdf, 'resource');
		if (res)
			// Remove #
			ret[res.substring(1)] = true;
	}
	return ret;
};

/*
 * FUNCTIONS FOR BASIC BioPAX 3 PROCESSORS
 */

/**
 * @author		Sungyoung Lee
 * @date		160621
 * @remark		BioPAX 3 compatible
 * @brief		Get the title of pathway according to the BioPAX 3 standard.
 * @param[in]	H_xml A {document} object of XML
 * @return		{String} the fetched title
 */
pathwayProcessor.prototype.bp3getTitle = function(H_xml) {
	var H_pwInfo	= H_xml.getElementsByTagNameNS(this.bp, 'Pathway')[0];
	var S_name		= this.bp3getName(H_pwInfo);
	if (S_name === null) {
		Lwarn("BIOPAX3 : Pathway have no name entry");
		return "";
	} else return S_name;
};

/**
 * @author		Sungyoung Lee
 * @date		160619
 * @remark		BioPAX 3 compatible
 * @remark		Supports non-standard directions contain underline(_) character
 * @brief		Determines and returns the 'direction' of reactions in the BioPAX 3
 * @param[in]	H_obj	An {Element} object to get the direction located inside
 * @param[in]	S_name	Child localName contains the direction, its NS should BP
 * @return		{undefined} if there is no direction information
 * @return		{bool} true if L->R, false if R->L
 */
pathwayProcessor.prototype.bp3procDirection = function(H_obj, S_name) {
	var B_L2R = undefined;
	var S_dir = H_obj.getChildTextNS(this.bp, S_name);
	switch (S_dir) {
	case 'LEFT_TO_RIGHT':
		Lcmt('Non-standard direction ['+S_dir+'] found');
	case 'LEFT-TO-RIGHT': B_L2R = true; break;
	case 'RIGHT_TO_LEFT':
		Lcmt('Non-standard direction ['+S_dir+'] found');
	case 'RIGHT-TO-LEFT': B_L2R = false; break;
	default: break;				
	}
	Ldebug("Step ["+H_obj.getAttributeNS(this.rdf, 'ID')+"] direction ["+(B_L2R===undefined?'???':(B_L2R?'L->R':'R->L'))+"]");
	return B_L2R;
};


pathwayProcessor.prototype.bp3annotate = function() {
	var _ = this;
	
	/* Collect information */
	var annot	= {};
	var res		= {};
	var N_anno	= 0;	/* Number of annotated {Element}s */
	
	/* Categorize annotations */
	Object.keys(A_need2anno).forEach(function(id) {
		var o = A_need2anno[id];
		var db = o.db.toLowerCase();
		if (undefined === annot[db]) annot[db] = [];
		annot[db].push(o.id);
	});
	
	/* Perform annotations */
	var A_annoResult = {};
	Object.keys(annot).forEach(function(i) {
		var v = annot[i];
		if (undefined === _.A_annoURL[i]) {
			Lerror('Annotation URL for DB ['+i+'] not found to annotate [' + v + ']');
			return;
		}
		A_annoResult[i] = {};
		Lnotice('Annotating ['+i+']... ['+v.length+'] entries');
		$.ajax({
			type:'post',
			url:_.A_annoURL[i][0],
			dataType:'json',
			data:{
				type:i,
				keys:v.join(_.A_annoURL[i][1])
			},
			async:false,
			success:function(a) {
				for (var j in a) {
					N_anno++;
					Ldebug(i+" ["+j+"] -> ["+a[j]+"]");
					A_annoResult[i][j] = a[j];
				}
			}
		});
	});
	Lcmt('['+N_anno+'] entires annotated');
	
	// Check children
	this.A_nodes.forEach(function(I) {
		var anno = [];
		for (var i=0 ; i<I.children.length ; i++) {
			var J = I.children[i];
			// Only one of them should be annotated
			if (J.tagName == 'bp:entityReference')
				anno_sub(_, _.A_bp3entry[_.bp3getResource(J)], A_annoResult).forEach(function(K) {
					anno.push(K);
				});
			else if (J.tagName == 'bp:xref') anno_xref(_, J, A_annoResult, anno);
		}
		if (!anno.length) {
			var name = _.bp3getName(I);
			if (!name)
				Lwarn('Element ['+I.id+'] does not have displayName nor annotation');
			else
				I.symbol = [ '<<'+name+'>>' ];
		} else
			I.symbol = anno;
	});
};

function anno_xref(_, x, A_annoResult, A_res) {
	// Assume both entries are existing since we already checked it
	var res = _.bp3getResource(x);
	if (res)
		anno_xref(_, _.A_bp3entry[res], A_annoResult, A_res);
	else {
		var db = x.getElementsByTagNameNS(_.bp,"db")[0].textContent.toLowerCase();
		var id = x.getElementsByTagNameNS(_.bp,"id")[0].textContent;
		if (undefined === A_annoResult[db] || undefined === A_annoResult[db][id]) {
			Lwarn('Annotation for DB ['+db+'] ID ['+id+'] not found');	
		} else {
			var S_anno = A_annoResult[db][id];
			if (undefined !== S_anno && S_anno.length && S_anno.length > 0)
				A_res.push(S_anno);
		}
	}
}

function anno_sub(_, o, A_annoResult) {
	var A_res = [];
	
	// It should have bp:xref
	for (var i=0 ; i<o.children.length ; i++) {
		var I = o.children[i];
		if (I.tagName != 'bp:xref') continue;
		anno_xref(_, I, A_annoResult, A_res);
	}
	
	return A_res;
}

/**
 * @author			Sungyoung Lee
 * @date			160622
 * @remark			BioPAX 3 compatible
 * @brief			Check the given Element has BP namespace and the given localName and assigns "id" if true
 * @param[in/out]	{Element} to check
 * @return			Nothing but H_obj.id will be appended if passed
 */
pathwayProcessor.prototype.bp3check = function(H_obj, S_tag) {
	/* Namespace should be BP */
	if (H_obj.namespaceURI != this.bp) return false;
	/* Tag should match */
	if (H_obj.localName != S_tag) return false;
	/* Add id if not exists */
	if (undefined === H_obj.id || !H_obj.id)
		H_obj.id = H_obj.getAttributeNS(this.rdf, 'ID');
	return true;
};

/*
 * FUNCTIONS FOR BP-NAMESPACE ELEMENT PROCESSOR
 */

pathwayProcessor.prototype.bp3procPathway = function(A_pw) {
	var _ = this;
	_.A_bp3edge = [];
	/* Grab all <bp:pathwayOrder> */
	for (var i=0 ; i<A_pw.length ; i++) {
		var H_pw = A_pw[i];
		
		var _po = this.bp3getData(H_pw, this.bp, 'pathwayOrder');
		_po.forEach(function(v) {
			switch (v.tagName) {
			case 'bp:BiochemicalPathwayStep':
				/* Check the tag have <bp:stepDirection> */
				var B_L2R = _.bp3procDirection(v, 'stepDirection');

				/* For all childs of <bp:stepProcess> */
				var A_sp = _.bp3getData(v, _.bp, 'stepProcess');
				if (A_sp.length == 0) {
					var A_sc = _.bp3getData(v, _.bp, 'stepConversion');
					if (A_sc.length == 0)
						Lerror("No interpretable step found in ["+v.id+"]");
					else {
						A_sc.forEach(function(w) {
							_.bp3procBiochemicalReaction(w, B_L2R);
						});
						Lcmt('BiochemicalPathwayStep ['+v.id+'] has ['+A_sc.length+'] stepConversion');
					}
					break;
				}
				Lcmt('BiochemicalPathwayStep ['+v.id+'] has ['+A_sp.length+'] stepProcess');
				A_sp.forEach(function(v) {
					_.bp3procCatalysis(v, B_L2R);
				});
				break;
			default:
				Lwarn('Uncontrolled pathwayOrder ['+v.tagName+']');
				break;
			}
		});
		/* If no pathwayOrder, do pathwayComponent */
		if (_po.length == 0) this.bp3getData(H_pw, this.bp, 'pathwayComponent').forEach(function(v) { switch (v.tagName) {
		case 'bp:Catalysis':
			_.bp3procCatalysis(v);
			break;
		case 'bp:BiochemicalReaction':
			_.bp3procBiochemicalReaction(v);
			break;
		default:
			Lerror('Invalid pathway component ['+v.tagName+']');
			break;
		} });
	}
};

pathwayProcessor.prototype.bp3procCatalysis = function(H_ct, B_L2R) {
	/* Check integrity */
	if (!this.bp3check(H_ct, 'Catalysis')) return false;
	
	var	_			= this;
	var res			= [];
	var typeCtrl	= H_ct.getChildTextNS(_.bp, 'controlType');
	var _ctrler		= this.bp3getData(H_ct, this.bp, 'controller');
	var ctrler		= _.bp3procController(H_ct, _ctrler, B_L2R);
	var _ctrled		= this.bp3getData(H_ct, this.bp, 'controlled');
	var ctrled		= _.bp3procControlled(H_ct, _ctrled, B_L2R);
	Lcmt("[REACTION] "+H_ct.tagName+" ["+ctrler.map(function(v) { return v.getAttributeNS(_.rdf, 'ID'); }).join(',')+"] " + typeCtrl + " ["+ctrled.map(function(v) { return v.getAttributeNS(_.rdf, 'ID'); }).join(',')+"]");

	var er = {};
	ctrler.forEach(function(I) {
		switch (I.tagName) {
		case 'bp:displayName':
			/* displayName -> ??? */
			er.displayName = I.textContent;
			break;
		case 'bp:Complex':
			/* Complex -> ??? */
			_.bp3getControllerComplex(I, er);
			break;
		case 'bp:xref':
			/* Xref -> ??? */
			_.bp3getControllerXref(I, er);
			break;
		default:
			Lwarn('[bp:Catalysis] Invalid controller ['+I.tagName+']');
			break;
		}
	});
	for (var j in er) if (er.hasOwnProperty(j)) res.push(er[j]);
	
	var ed = {};
	ctrled.forEach(function(I) {
		switch (I.tagName) {
		case 'bp:displayName':
			/* displayName -> ??? */
			ed.displayName = I.textContent;
			break;
		case 'bp:BiochemicalReaction':
			ed = _.bp3getNodeBiochemicalReaction(ctrled);
			break;
		default:
			Lwarn('[bp:Catalysis] Invalid controlled ['+I.tagName+']');
			break;
		}
	});
	for (var j in ed) if (ed.hasOwnProperty(j)) res.push(ed[j]);

	return true;
};

/**
 * BioPAX 3 compatible
 * Parses <bp:BiochemicalReaction>
 * @argument {Element(bp:BiochemicalReaction)} A BiochemicalReaction element
 * @argument {bool} No default value, L->R if true
 */
pathwayProcessor.prototype.bp3procBiochemicalReaction = function(H_br, B_L2R) {
	var _ = this;
	
	/* Check integrity */
	if (!this.bp3check(H_br, 'BiochemicalReaction')) return false;
	
	/* Check direction */
	var B_subL2R = this.bp3procDirection(H_br, 'conversionDirection');
	if (undefined === B_subL2R && undefined === B_L2R) {
		/* 171129 assume L->R */
		B_L2R = true;
		//Lwarn('Invalid direction in bp3procBiochemicalReaction ['+H_br.id+']');
	}
	
	/* Check type */
	H_br.type = 'indirect effect';
	var H_it = this.bp3getData(H_br, this.bp, 'interactionType');
	if (H_it.length == 1) {
		var _it = H_it[0];
		H_br.type = _it.getChildTextNS(this.bp, 'term');
		Lcmt("BiochemReact ["+H_br.id+"] -> ["+H_br.type+"]");
	} else
		Lcmt("BiochemReact ["+H_br.id+"] do not have interactionType");

	/* Get left & right */
	var _L = this.bp3getData(H_br, this.bp, B_L2R?'left':'right');
	var _R = this.bp3getData(H_br, this.bp, B_L2R?'right':'left');
	/* Both have length? */
	if (!_L.length || !_R.length) {
		Lerror("Reaction ["+H_br.id+"] do not have left["+_L.length+"] nor right["+_R.length+"]");
		return false;
	}
	Ldebug("BiochemicalReaction ["+H_br.id+"] direction ["+
		(B_L2R?"L->R":"R->L")
		+"]");
	/* For both L and R, get rdf:resource */
	var __L = [], __R = [];
	for (var i=0 ; i<_L.length ; i++) __L.push(_L[i].id);
	for (var i=0 ; i<_R.length ; i++) __R.push(_R[i].id);
	Ldebug("   From ["+__L.join(',')+"]");
	Ldebug("   To   ["+__R.join(',')+"]");
	H_br.L = _L;
	H_br.R = _R;
	
	var o = _.data(H_br);
	H_br.L.forEach(function(v) {
		H_br.R.forEach(function(w) {
			if (undefined !== o.catalysisDst) o.catalysisDst.forEach(function(x) {
				_.A_bp3edge.push({
					from:	v.id,
					to:		x.id,
					class:	[ H_br.type ]
				});
				_.A_bp3edge.push({
					from:	x.id,
					to:		w.id,
					class:	[ H_br.type ]
				});
			}); else _.A_bp3edge.push({
				from:	v.id,
				to:		w.id,
				class:	[ H_br.type ]
			});
		});
	});
	if (undefined !== o.catalysisDst) o.catalysisDst.forEach(function(x) {
		_.A_bp3edge.push({
			from:  x.from.id,
			to:    x.id,
			class: [ 'catalysis' ]
		});
	});
	
	return true;
};

/* BioPAX 3 compatible */
pathwayProcessor.prototype.bp3procController = function(H_parent, A_ctrler, B_L2R) {
	var _ = this;
	var ret = [];
	if (A_ctrler === undefined) {
		Lerror("["+H_parent.id+"] undefined controller!");
		return ret;
	}
	if (A_ctrler.length > 1)
		Lwarn('Too many controller found');
	var v = A_ctrler[0];
	for (var i=0 ; i<v.childNodes.length ; i++) {
		var I = v.childNodes[i];
		I.anno = [];
		switch (I.tagName) {
		case 'bp:Complex':
			// Get components
			var q = I.getElementsByTagNameNS(this.bp, 'component');
			I.anno.push(q[0].getAttributeNS(this.rdf, 'resource'));
			
			ret.push(I);
			break;
		/* 171129 EntityReference */
		case 'bp:entityReference':
			break;
		/* 171129 */
		case 'bp:displayName':
			I.anno.push('text:'+I.textContent);
			ret.push(I);
			break;
		case 'bp:xref':
			var tmp = _.bp3getData(I.parentElement, _.bp, 'xref')[0];
			switch (tmp.tagName) {
			case 'bp:PublicationXref':
				var aDB = tmp.getElementsByTagNameNS(_.bp, 'db');
				var aID = tmp.getElementsByTagNameNS(_.bp, 'id');
				if (aDB.length != aID.length)
					Lerror('PublicationXref DB and ID length unmatch');
				else if (aDB.length == 0)
					Lwarn('PublicationXref does not have publication information');
				for (var i=0 ; i<aDB.length ; i++)
					I.anno.push(aDB[i].textContent+':'+aID[i].textContent);
				ret.push(I);
				break;
			default:
				Lwarn('Errornous Xref type for Controller ['+tmp.tagName+']');
				break;
			} break;
		case undefined: break;
		default:
			Lwarn('Errornous controller child node tag ['+I.tagName+']');
			break;
		}
	}
	/* Grab tags */
	var tags = {};
	ret.forEach(function(v) {
		if (undefined === v.anno) return;
		var tagsSub = _.bp3extractTagsFromArray(v.anno);
		tagsSub.forEach(function(v) {
			tags[v] = true;
		});
	});
	// Get tags if not cached
	_.bp3cacheElementsByTagNames(tags);
	
	// Convert elements
	ret.forEach(function(v) {
		if (undefined === v.anno) return;
		_.bp3convertID2element(v.anno);
	});
	
	return ret;
};

pathwayProcessor.prototype.bp3attachAnnotation = function(A_anno, ret) {
	var _ = this;
	for (var i=0 ; i<A_anno.length ; i++) {
		var o = A_anno[i];
		if (o instanceof Element)
			ret[o.id] = o;
		else {
			var tmp = _.bp3interpretNonElemAnno(o);
			if (tmp === undefined)
				Lerror('Uninterpretable node exists in [anno] of bp:Complex');
		}
	}
}

pathwayProcessor.prototype.bp3getNodeComplex = function(A_elem) {
	var _ = this;
	var xml = this.xml();
	var ret = {};
	A_elem.forEach(function(I) {
		// Tag check
		if (I.tagName != 'bp:Complex') {
			Lerror('['+I.tagName+'] is not a bp:Complex node');
			return;
		}
		// Get components and return
		_.bp3attachAnnotation(I.anno, ret);
	});
	return ret;
}

pathwayProcessor.prototype.bp3getControllerComplex = function(I, ret) {
	var xml = this.xml();
	// Tag check
	if (I.tagName != 'bp:Complex') {
		Lerror('['+I.tagName+'] is not a bp:Complex node');
		return;
	}
	// Get components and return
	this.bp3attachAnnotation(I.anno, ret);
	return ret;
}

pathwayProcessor.prototype.bp3getControllerXref = function(I, ret) {
	var xml = this.xml();
	// Tag check
	if (I.tagName != 'bp:xref') {
		Lerror('['+I.tagName+'] is not a bp:xref node');
		return;
	}
	// Get components and return
	this.bp3attachAnnotation(I.anno, ret);
	return ret;
}

pathwayProcessor.prototype.bp3getNodeBiochemicalReaction = function(A_elem) {
	var xml = this.xml();
	var ret = {};
	var F_procComponentScan = function(v) {
		if (v instanceof Element)
			ret[v.id] = v;
		else {
			Lerror('Uninterpretable node [id='+v.id+'] exists in <bp:BiochemicalReaction>');
			return {};
		}		
	};
	A_elem.forEach(function(I) {
		// Tag check
		if (I.tagName != 'bp:BiochemicalReaction') {
			Lerror('['+v.tagName+'] is not a bp:BiochemicalReaction node');
			return {};
		}
		// Get components and return
		if (I.L === undefined || I.R === undefined)
			Lwarn("LEFT/RIGHT relationship of bp:BiochemicalReaction not found, maybe premature initiation?");
		if (I.L !== undefined) I.L.forEach(F_procComponentScan);
		if (I.R !== undefined) I.R.forEach(F_procComponentScan);
	});
	return ret;
}

/* BioPAX 3 compatible */
pathwayProcessor.prototype.bp3procControlled = function(H_parent, A_ctrled, B_L2R) {
	var ret = [];
	var _ = this;
	if (A_ctrled.length < 1)
		Lwarn('No controlled found');
	else if (A_ctrled.length > 1)
		Lwarn('Too many controlled found');
	var v = A_ctrled[0];
	switch (v.tagName) {
	case 'bp:BiochemicalReaction':
		// Get components
		_.bp3procBiochemicalReaction(v, B_L2R);
//		var tags = _.bp3extractTagsFromArray(v.L, v.R);
		
		// Get tags if not cached
//		_.bp3cacheElementsByTagNames(tags);
		
		// Convert elements
//		_.bp3convertID2element(v.L, v.R);
		
		ret.push(v);
		break;
	case undefined: break;
	default:
		Lwarn('Errornous controlled child node tag ['+v.tagName+']');
		break;
	}
	return ret;
};

pathwayProcessor.prototype.bp3initEntries = function() {
	var _ = this;
	this.A_nodes.forEach(function(I) {
		/* Insert to A_entry */
		_.A_entry[I.id] = I;
	});
};

pathwayProcessor.prototype.data = function(o, data) {
	if (undefined === o.ivip) o.ivip = {};
	if (undefined === data) return o.ivip;
	Object.keys(data).forEach(function(i) {
		var I = data[i];
		if (undefined === o.ivip[i]) o.ivip[i] = [];
		o.ivip[i].push(I);
	});
};

pathwayProcessor.prototype.bp3getEdges = function(xml) {
	var _ = this;
	var xml = this.xml();
	var ret = [];
	this.bp3procPathway(xml.getElementsByTagNameNS(_.bp, 'Pathway'));
	this.A_bp3edge.forEach(function(I) {
		ret.push(I);
	});
	return ret;
}

pathwayProcessor.prototype.bp3getNodes = function(xml) {
	var _ = this;
	
	var A_target = this.bp3getElementsByTagNames('Protein', 'SmallMolecule', 'Catalysis');
	this.A_nodes = [];
	this.N_idCatalysis = 0;
	A_target.forEach(function(v) { switch (v.tagName) {
	case 'bp:Catalysis':
		var er = _.bp3getData(v, _.bp, 'controller');
		var ed = _.bp3getData(v, _.bp, 'controlled');
		if (er.length != 1 || ed.length != 1)
			Lerror('Unexpected controller/controlled length ['+er.length+'] and ['+ed.length+']');
		switch (er[0].tagName) {
		case 'bp:Complex':
		case 'bp:Protein':
			break;
		default: Lerror('Unexpected catalysis controller type ['+er[0].tagName+']'); break;
		}
		switch (ed[0].tagName) {
		case 'bp:BiochemicalReaction':
			var q = document.createElement('ivip-catalysis');
			q.from = er[0];
			q.to = ed[0];
			q.id = 'ivipCatalysis' + (_.N_idCatalysis++);
			q.type = 'catalysis';
			q.symbol = '';
			_.data(er[0], {catalysisSrc:q});
			_.data(ed[0], {catalysisDst:q});
			_.A_nodes.push(q);
			break;
		default: Lerror('Unexpected catalysis controlled type ['+ed[0].tagName+']'); break;
		}		
		break;
	case 'bp:SmallMolecule':
		var str = _.bp3getData(v, _.bp, 'structure');
		if (str.length) switch (str[0].getChildTextNS(_.bp, 'structureFormat')) {
		case 'InChI':
			var _key = str[0].getChildTextNS(_.bp, 'structureData');
			$.ajax({
				type:'post',
				url:'stream.php?url='+encodeURIComponent(
					'http://www.chemspider.com/InChI.asmx/InChIToCSID?inchi='+encodeURIComponent(_key)
				),
				dataType:'xml',
				async:false,
				success:function(a) {
					if (a.childNodes[0].textContent.length) {
						v.image = 'http://www.chemspider.com/ImagesHandler.ashx?id='+a.childNodes[0].textContent+'&w=250&h=250';
						Lcmt('Structure image ['+v.image+']');
					}
				}
			});
			break;
		}
	case 'bp:Protein':
		v.type		= v.localName=='Protein' ? 'gene' : 'compound';
		_.A_nodes.push(v);
		break;
	default:
		Lerror('Unexpected node tag ['+v.tagName+']');
		break;
	} });
	return this.A_nodes;
	
	
	// Get the tags to process from all <bp:pathwayOrder>
	var _target = this.bp3getResourcesByElement(
		xml.getElementsByTagNameNS(_.bp, 'pathwayOrder')
	);
	var tags = this.bp3extractTagsFromArray(_target);
	// Get all tags related to that
	var alltags = [];
	tags.forEach(function(i) {
		alltags.push(xml.getElementsByTagNameNS(_.bp, i));
	});
	// For the grabbed tags, filter what we need
	var targettags = [];
	alltags.forEach(function(v) {
		for (var i=0 ; i<v.length ; i++) {
			// get rdf:ID
			var _i = v[i].getAttributeNS(_.rdf, 'ID');
			if (_i && undefined !== _target[_i]) {
				v[i].id = _i;
				targettags.push(v[i]);
			}
		}
	});
	Lcmt('['+targettags.length+'] objects found to process');
	
	// Process
	/* For targettags, find controller in <Catalysis> */
	var res = [];
	targettags.forEach(function(v) {
		switch (v.tagName) {
		case 'bp:BiochemicalPathwayStep':
			break;
		default:
			Lerror("Uncontrolled tag ["+v.tagName+"]");
			break;
		}
		v.getElementsByTagNameNS(_.bp, 'Protein');
	});
	
	return res;
	
	// Grab all bp:pathwayComponent
	var _pc = xml.getElementsByTagNameNS(_.bp, 'pathwayComponent');
	var _target = {};
	for (var i=0 ; i<_pc.length ; i++) {
		var I = _pc[i];
		// Get rdf:resource
		var res = I.getAttributeNS(_.rdf, 'resource');
		if (res)
			// Remove #
			_target[res.substring(1)] = true;
	}
	
	// Get the tags to process
	var tags = _.bp3extractTagsFromArray(_target);
	
	// Get all tags related to that
	var alltags = [];
	tags.forEach(function(i) {
		alltags.push(xml.getElementsByTagNameNS(_.bp, i));
	});
		
	// For the grabbed tags, filter what we need
	var targettags = [];
	alltags.forEach(function(v) {
		for (var i=0 ; i<v.length ; i++) {
			// get rdf:ID
			var _i = v[i].getAttributeNS(_.rdf, 'ID');
			if (_i && undefined !== _target[_i]) {
				v[i].id = _i;
				targettags.push(v[i]);
			}
		}
	});
	Lcmt('['+targettags.length+'] objects found to process');
	
	return targettags;
};

/*
 * VARIABLES
 */
/* Namespaces for BioPAX 3 */
pathwayProcessor.prototype.bp	=
	"http://www.biopax.org/release/biopax-level3.owl#";
pathwayProcessor.prototype.rdf	=
	"http://www.w3.org/1999/02/22-rdf-syntax-ns#";

/* Required information for annotation
 * [0] = URL to annotate
 * [1] = Concatenator for multiple names to annotate
 */
pathwayProcessor.prototype.A_annoURL = {
	'refmet':			['anno/asis.php', '|'],
	'biocyc':			['anno/asis.php', '|'],
	'humancyc':			['anno/asis.php', '|'],

	'entrez gene':		['anno/pair.php', '|'],
	'entrez':			['anno/pair.php', '|'],
	'pharmgkb':			['anno/pair.php', '|'],
	'interpro':			['anno/pair.php', '|'],
	'pfam':				['anno/pair.php', '|'],
	'prosite':			['anno/pair.php', '|'],
	'prints':			['anno/pair.php', '|'],
	'taxonomy':			['anno/pair.php', '|'],
	'ncbi taxonomy':	['anno/pair.php', '|'],
	'omim':				['anno/pair.php', '|'],
	'hprd':				['anno/pair.php', '|'],
	

	'pathwhiz':			['pathwhiz2pathwayname.php', '|'],
	'smpdb':			['smpdb2pathwayname.php', '|'],
	'pubmed':			['pmid2info.php', ' '],
	'kegg compound':	['compoundid2compoundname.php', ' '],
	'pubchem-compound':	['pubchemcompoundid2compoundname.php', '|'],
	'reactome database id release 62':
						['reactome2pathwayname.php', '|'],
	'gene ontology':	['go2pathwayname.php', '|'],

	uniprot:		['uniprot2genesymbol.php', '|'],
	keggligand:		['compoundid2compoundname.php', ' '],
	cpd:			['compoundid2compoundname.php', ' '],
	pubchemcompound:['pubchemcompoundid2compoundname.php', '|'],
	knapsack:		['knapsackid2compoundname.php', '|'],
	hmdb:			['hmdbid2compoundname.php', '|'],
	chebi:			['chebi2compoundname.php', '|'],
	ensembl:		['ensemblid2genesymbol.php', '|'],
	chemspider:		['chemspider2compoundname.php', '|'],
};
