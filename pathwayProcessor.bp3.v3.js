/*
 * POLYFILL
 */

if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		'use strict';
		if (this == null) throw new TypeError('can\'t convert ' + this + ' to object');
		var str = '' + this;
		count = +count;
		if (count != count) count = 0;
		if (count < 0)
			throw new RangeError('repeat count must be non-negative');
		if (count == Infinity)
			throw new RangeError('repeat count must be less than infinity');
		count = Math.floor(count);
		if (str.length == 0 || count == 0) return '';
		// Ensuring count is a 31-bit integer allows us to heavily optimize the
		// main part. But anyway, most current (August 2014) browsers can't handle
		// strings 1 << 28 chars or longer, so:
		if (str.length * count >= 1 << 28)
			throw new RangeError('repeat count must not overflow maximum string size');
		var rpt = '';
		for (var i = 0; i < count; i++) rpt += str;
		return rpt;
	}
}

if (!Array.from) {
	Array.from = (function () {
		var toStr = Object.prototype.toString;
		var isCallable = function (fn) {
			return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
		};
		var toInteger = function (value) {
			var number = Number(value);
			if (isNaN(number)) { return 0; }
			if (number === 0 || !isFinite(number)) { return number; }
			return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
		};
		var maxSafeInteger = Math.pow(2, 53) - 1;
		var toLength = function (value) {
			var len = toInteger(value);
			return Math.min(Math.max(len, 0), maxSafeInteger);
		};

		// The length property of the from method is 1.
		return function from(arrayLike/*, mapFn, thisArg */) {
			// 1. Let C be the this value.
			var C = this;

			// 2. Let items be ToObject(arrayLike).
			var items = Object(arrayLike);

			// 3. ReturnIfAbrupt(items).
			if (arrayLike == null)
				throw new TypeError("Array.from requires an array-like object - not null or undefined");

			// 4. If mapfn is undefined, then let mapping be false.
			var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
			var T;
			if (typeof mapFn !== 'undefined') {
				// 5. else      
				// 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
				if (!isCallable(mapFn))
					throw new TypeError('Array.from: when provided, the second argument must be a function');

				// 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
				if (arguments.length > 2) T = arguments[2];
			}

			// 10. Let lenValue be Get(items, "length").
			// 11. Let len be ToLength(lenValue).
			var len = toLength(items.length);

			// 13. If IsConstructor(C) is true, then
			// 13. a. Let A be the result of calling the [[Construct]] internal method of C with an argument list containing the single item len.
			// 14. a. Else, Let A be ArrayCreate(len).
			var A = isCallable(C) ? Object(new C(len)) : new Array(len);

			// 16. Let k be 0.
			var k = 0;
			// 17. Repeat, while k < len… (also steps a - h)
			var kValue;
			while (k < len) {
				kValue = items[k];
				A[k] = mapFn ? (typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k)):kValue;
				k += 1;
			}
			// 18. Let putStatus be Put(A, "length", len, true).
			A.length = len;
			// 20. Return A.
			return A;
		};
	}());
}

/*
 * FUNCTIONS FOR ELEMENTARY BEHAVIORS
 */
 
Array.prototype.unique = function() {
	return Array.from(new Set(this))
};

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
	if (!S_name)
		S_name = H_obj.getChildTextNS(this.bp, 'name');
	return !S_name ? null : S_name;	
};

pathwayProcessor.prototype.bp3getResource = function(H_obj) {
	var r = H_obj.getAttributeNS(this.rdf, 'resource');
	return !r ? null : (r.charAt(0) == '#' ? r.substring(1) : r);
};

// xref ID -> db/id
var A_need2anno = {};
pathwayProcessor.prototype.dump_sub = function(_, e, lv, B_retString) {
	var _ = this;
	if (undefined === B_retString) B_retString = false;
	
	var F_1 = function(v){if(v.length!=1)throw v[0].parentElement;};
	var F_text = function(v){F_1(v);return v[0].textContent;};
	var F_textN = function(v){var t=[];v.forEach(function(I){t.push(I.textContent);});return t.join(" ||| ");};
	var F_resource = function(v){F_1(v);
		var x = _.bp3getResource(v[0]);
		return x ? x : v[0].firstElementChild.id; };
	var F_resourceN = function(v){var t=[];v.forEach(function(I){
		var x = _.bp3getResource(I); 
		t.push(x ? x : I.firstElementChild.id);});return t.join(" ||| ");};
	var F_xrefN = function(v){var t=[];v.forEach(function(I){
		var x = _.bp3getResource(I);
		t.push(_.dump_sub(_, x ? _.A_bp3entry[x] : I.firstElementChild, 0, true));
		//t.push(_.A_bp3entry[r].tagName+'['+r+']');		
	});return t.join(" ||| ");};
	var F_xref = function(v){F_1(v);
		var x = _.bp3getResource(v[0]);
		return _.dump_sub(_, x ? _.A_bp3entry[x] : v[0].firstElementChild, 0, true);};
	this.A_tagInfo = {
		'bp:BindingFeature': {
			print: '[????] [BINDFEATURE ]',
			expect: {},
			optional: {
				'bp:bindsTo':F_resourceN,
				'bp:comment':F_textN, }, },
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
				'bp:comment':F_textN,
				'bp:conversionDirection':F_text,
				'bp:dataSource':F_text,
				'bp:deltaG':F_resource,
				'bp:displayName':F_text,
				'bp:eCNumber':F_textN,
				'bp:evidence':F_resourceN,
				'bp:interactionType':F_resource,
				'bp:left':F_resourceN,
				'bp:name':F_textN,
				'bp:right':F_resourceN,
				'bp:participantStoichiometry':F_resourceN,
				'bp:spontaneous':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, },
			store: true, },
		'bp:BioSource': {
			print: '[????] [BIOSOURCE   ]',
			returnPrint: '[BIOS]', expect: {},
			optional: {
				'bp:cellType':F_resource,
				'bp:displayName':F_text,
				'bp:name':F_text,
				'bp:standardName':F_text,
				'bp:taxonXref':F_xref,
				'bp:tissue':F_resource, 
				'bp:xref':F_xref,},
			},
		'bp:Catalysis': {
			print: '[FUNC] [CATALYSIS   ]', expect: {},
			optional: {
				'bp:cofactor':F_resourceN,
				'bp:controlled':F_resource,
				'bp:controller':F_resourceN,
				'bp:controlType':F_text,
				'bp:conversionDirection':F_text,
				'bp:catalysisDirection':F_text,
				'bp:comment':F_textN,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:name':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, },
			store: true, },
		'bp:CellularLocationVocabulary': {
			print: '[ REF] [CELLLOCAVOCA]', expect: {},
			optional: {'bp:comment':F_text,'bp:term':F_text,'bp:xref':F_xrefN}, },
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
				'bp:component':F_resourceN, 
				'bp:componentStoichiometry':F_resourceN,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:feature':F_resourceN,
				'bp:memberPhysicalEntity':F_resourceN,
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, }, },
		'bp:ComplexAssembly': {
			print: '[FUNC] [COMPLEXASSEM]', expect: {'bp:left':F_resourceN,},
			optional: {
				'bp:comment':F_textN,
				'bp:conversionDirection':F_text,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:interactionType':F_resource,
				'bp:participantStoichiometry':F_resourceN,
				'bp:right':F_resourceN,
				'bp:spontaneous':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN,}, },
		'bp:Control': {
			print: '[FUNC] [CONTROL     ]', expect: {},
			optional: {
				'bp:comment':F_textN,
				'bp:controlled':F_resource,
				'bp:controller':F_resource,
				'bp:controlType':F_text,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, }, },
		'bp:Conversion': {
			print: '[FUNC] [CONVERSION  ]', expect: {'bp:left':F_resourceN,'bp:right':F_resourceN, },
			optional: {
				'bp:conversionDirection':F_text,
				'bp:displayName':F_text,
				'bp:interactionType':F_resource,
				'bp:participantStoichiometry':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xref,
			}, },
		'bp:Degradation': {
			print: '[FUNC] [DEGRADATION ]', expect: {'bp:left':F_resource,'bp:right':F_resource,},
			optional: {
				'bp:conversionDirection':F_text,
				'bp:displayName':F_text,
				'bp:interactionType':F_resource,
				'bp:participantStoichiometry':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xref,
			}, },
		'bp:DeltaG': {
			print: '[????] [DELTAG      ]', expect: {'bp:deltaGPrime0':F_text, }, },
		'bp:DnaReference': {
			print: '[ REF] [DNAREFERENCE]',
			returnPrint: '[RDNR]',
			expect: { 'bp:name':F_text, },
			optional: {
				'bp:evidence':F_resource,
				'bp:organism':F_resource,
				'bp:xref':F_xref, },
			returnOnly:true, },
		'bp:DnaRegion': {
			print: '[ REF] [DNAREGION   ]', expect: {
				'bp:comment':F_textN,
				'bp:displayName':F_text,
				'bp:standardName':F_text, },
			optional: {
				'bp:cellularLocation':F_text,
				'bp:entityReference':F_xref,
				'bp:feature':F_resource, }, },
		'bp:DnaRegionReference': {
			print: '[ REF] [DNAREGIONREF]', expect: {
				'bp:memberEntityReference':F_xrefN,
				'bp:xref':F_xref,
				'bp:comment':F_textN,
				'bp:standardName':F_text,
				'bp:displayName':F_text, },
			optional: {
				}, },
		'bp:EntityFeature': {
			print: '[????] [ENTTYFEATURE]',
			expect: { 'bp:comment':F_text }, },
		'bp:Evidence': {
			print: '[????] [EVIDENCE    ]',
			expect: {},
			optional: {
				'bp:comment':F_text,
				'bp:evidenceCode':F_resource,
				'bp:xref':F_xref, }, },
		'bp:EvidenceCodeVocabulary': {
			print: '[ REF] [EVIDCODEVOCA]',
			returnPrint: '[EVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xref},
			returnOnly: true, },
		'bp:FragmentFeature': {
			print: '[ REF] [FRAGFEATURE ]',
			returnPrint: '[FFEA]',
			expect: {'bp:featureLocation':F_resource,},
			optional: {}, },
		'bp:Interaction': {
			print: '[????] [INTERACTION ]', expect: {
				'bp:displayName':F_text,
				'bp:participant':F_resourceN, },
			optional: {
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:xref':F_xref, }, },
		'bp:InteractionVocabulary': {
			print: '[ REF] [INTERACTVOCA]',
			returnPrint: '[IVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xrefN},
			returnOnly: true, },
		'bp:ModificationFeature': {
			print: '[????] [MODIFEATURE ]', expect: {},
			optional: {
				'bp:comment':F_textN,
				'bp:modificationType':F_resource,
				'bp:featureLocation':F_resource,
				'bp:featureLocationType':F_resource,
			},
			returnOnly: true, },
		'bp:Modulation': {
			print: '[FUNC] [MODULATION  ]', expect: {
				'bp:controlled':F_resource,
				'bp:controller':F_resource,
				'bp:xref':F_xref, },
			optional: { 'bp:controlType':F_text, }, },
		'bp:MolecularInteraction': {
			print: '[FUNC] [MOLEINTERACT]', expect: {
				'bp:evidence':F_resource,
				'bp:participant':F_resourceN,
				'bp:xref':F_xrefN, },
			optional: {},
			store: true, },
		'bp:Pathway': {
			print: '[PWAY]', expect: {},
			optional:{
				'bp:availability':F_text,
				'bp:comment':F_textN,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:name':F_text,
				'bp:organism':F_text,
				'bp:pathwayComponent':F_xrefN,
				'bp:pathwayOrder':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN}, },
		'bp:PathwayStep': {
			print: '[PWAY] [STEP        ]',
			expect: { 'bp:stepProcess':F_resourceN },
			store: true, },
		'bp:PhysicalEntity':{
			print: '[????] [PHYSICALETTY]',
			expect: { 'bp:comment':F_textN, 'bp:displayName':F_text,
				'bp:standardName':F_text, },
			optional: { 'bp:cellularLocation':F_text, }, },
		'bp:Protein': {
			print: '[FUNC] [PROTEIN     ]', expect: {},
			annoref: [ 'pubmed' ],
			optional: {
				'bp:cellularLocation':F_text,
				'bp:comment':F_textN,
				'bp:feature':F_resourceN,
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:entityReference':F_xref,
				'bp:standardName':F_text,
				'bp:memberPhysicalEntity':F_textN,
				'bp:name':F_textN,
				'bp:organism':F_resource,
				'bp:xref':F_xrefN, }, },
		'bp:ProteinReference': {
			print: '[ REF] [PROTEIN     ]',
			returnPrint: '[RPRT]',
			expect: {},
			optional: {
				'bp:cellularLocation':F_text,
				'bp:comment':F_textN,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:memberEntityReference':F_resourceN,
				'bp:name':F_textN,
				'bp:organism':F_resource,
				'bp:sequence':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN,
			}, returnOnly: true, },
		'bp:Provenance': {
			print: '[????] [PROVENANCE  ]',
			returnPrint: '[PROV]', expect: {},
			optional: {
				'bp:displayName':F_text,
				'bp:name':F_text,
				'bp:standardName':F_text,
				'bp:comment':F_text,
				'bp:xref':F_xref, }, },
		'bp:PublicationXref': {
			print: '[XREF] [PUBLICATION ]',
			returnPrint: '[XPUB]',
			expect: {'bp:db':F_text,'bp:id':F_text},
			optional: {'bp:year':F_text,'bp:author':F_textN,'bp:source':F_text,'bp:title':F_text},
			returnOnly: true, needAnnotate: true, },
		'bp:RelationshipXref': {
			print: '[XREF] [RELATIONSHIP]',
			returnPrint: '[XREL]',
			expect: {},
			optional: {
				'bp:db':F_text,
				'bp:comment':F_textN,
				'bp:id':F_text,
				'bp:relationshipType':F_resource, },
			returnOnly: true, needAnnotate: true, },
		'bp:RelationshipTypeVocabulary': {
			print: '[ REF] [RELATYPEVOCA]',
			returnPrint: '[RVOC]',
			expect: {},
			optional: {'bp:term':F_text,'bp:xref':F_xref},
			returnOnly: true, },
		'bp:Rna': {
			print: '[FUNC] [RNA         ]',
			expect: {},
			optional: {
				'bp:entityReference':F_xref,
				'bp:name':F_text,
				'bp:cellularLocation':F_resource,
				'bp:displayName':F_text, }, },
		'bp:RnaReference': {
			print: '[ REF] [RNA         ]',
			returnPrint: '[RRNA]',
			expect: {},
			optional: {
				'bp:organism':F_resource,
				'bp:displayName':F_text,
				'bp:name':F_text,
				'bp:xref':F_xref, },
			returnOnly:true, },
		'bp:RnaRegion': {
			print: '[ REF] [RNAREGION   ]', expect: { 'bp:comment':F_text, },
			optional: {
				'bp:cellularLocation':F_resource,
				'bp:displayName':F_text,
				'bp:entityReference':F_xref,
				'bp:feature':F_resource,
				'bp:standardName':F_text, }, },
		'bp:RnaRegionReference': {
			print: '[ REF] [DNAREGIONREF]', expect: {
				'bp:comment':F_textN,
				'bp:standardName':F_text,
				'bp:displayName':F_text, }, },
		'bp:SequenceInterval': {
			print: '[ REF] [SEQINTERVAL ]', expect: {
				'bp:sequenceIntervalBegin':F_resource,
				'bp:sequenceIntervalEnd':F_resource,
			}, },
		'bp:SequenceSite': { // FIXME
			print: '[ REF] [SEQUENCESITE]', expect: {},
			optional: {
				'bp:sequencePosition':F_text,
				'bp:positionStatus':F_text,
			}, },
		'bp:SequenceModificationVocabulary': {
			print: '[ REF] [SEQMODVOCA  ]', expect: {},
			optional: {
				'bp:comment':F_text,
				'bp:term':F_text,
				'bp:xref':F_xref, }, },
		'bp:SequenceRegionVocabulary': { // FIXME
			print: '[ REF] [SEQRGNVOCA  ]', expect: {}, },
		'bp:SmallMolecule': {
			print: '[FUNC] [SMALLMOLCULE]', expect: {},
			optional: {
				'bp:cellularLocation':F_text,
				'bp:displayName':F_text,
				'bp:dataSource':F_text,
				'bp:entityReference':F_xref,
				'bp:feature':F_resource,
				'bp:memberPhysicalEntity':F_resourceN,
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:comment':F_textN,
				'bp:xref':F_xrefN, },
			store: true, },
		'bp:SmallMoleculeReference': {
			print: '[ REF] [SMALLMOLCULE]',
			returnPrint: '[RMOL]',
			expect: {},
			optional: {
				'bp:chemicalFormula':F_text,
				'bp:comment':F_textN,
				'bp:displayName':F_text,
				'bp:memberEntityReference':F_resourceN,
				'bp:molecularWeight':F_text,
				'bp:name':F_textN,
				'bp:standardName':F_text,
				'bp:structure':F_resource, 
				'bp:xref':F_xrefN, },
			returnOnly: true, },
		'bp:Stoichiometry': {
			print: '[????] [STOICHIOMTRY]',
			expect: {
				'bp:physicalEntity':F_resourceN,
				'bp:stoichiometricCoefficient':F_textN, },
			optional: { 'bp:deltaG':F_resource, }, },
		'bp:TemplateReaction': {
			print: '[FUNC] [TMPLREACTION]', expect: {},
			optional: {
				'bp:comment':F_text,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:interactionType':F_resource,
				'bp:participant':F_resourceN,
				'bp:product':F_resource,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, }, },
		'bp:TemplateReactionRegulation': {
			print: '[FUNC] [TMPREACTREGU]', expect: {
				'bp:controlled':F_resource, },
			optional: {
				'bp:controller':F_resource,
				'bp:controlType':F_text,
				'bp:dataSource':F_resource,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN,
			}, },
		'bp:TissueVocabulary': {
			print: '[ REF] [TISSUEVOCA  ]', expect: {'bp:term':F_text,'bp:xref':F_xref}, },
		'bp:Transport': {
			print: '[FUNC] [TRANSPORT   ]', expect: {'bp:left':F_resourceN,'bp:right':F_resourceN,},
			optional: {
				'bp:dataSource':F_text,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:standardName':F_text,
				'bp:spontaneous':F_text,
				'bp:participantStoichiometry':F_resourceN,
				'bp:comment':F_textN,
				'bp:conversionDirection':F_text,
				'bp:name':F_text,
				'bp:xref':F_xrefN,},
			store: true, },
		'bp:TransportWithBiochemicalReaction': {
			print: '[FUNC] [TRANSBIORACT]',
			expect: {
				'bp:dataSource':F_text,
				'bp:left':F_resourceN,
				'bp:participantStoichiometry':F_resourceN,
				'bp:right':F_resourceN, },
			optional: {
				'bp:conversionDirection':F_text,
				'bp:displayName':F_text,
				'bp:evidence':F_resourceN,
				'bp:interactionType':F_resource,
				'bp:spontaneous':F_text,
				'bp:standardName':F_text,
				'bp:xref':F_xrefN, }, },
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
	case 'bp:MolecularInteraction':
	case 'bp:Evidence':
	case 'bp:Modulation':
	case 'bp:DeltaG':
	
	case 'bp:Pathway':
	case 'bp:PathwayStep':
	case 'bp:BiochemicalPathwayStep':
	
	case 'bp:BiochemicalReaction':
	case 'bp:Transport':
	case 'bp:TransportWithBiochemicalReaction':
	case 'bp:ComplexAssembly':
	case 'bp:Control':
	case 'bp:Degradation':
	case 'bp:Conversion':
	case 'bp:TemplateReaction':
	case 'bp:TemplateReactionRegulation':
	
	case 'bp:Stoichiometry':
	
	case 'bp:ModificationFeature':
	case 'bp:BindingFeature':
	case 'bp:EntityFeature':
	case 'bp:FragmentFeature':
	case 'bp:PhysicalEntity':
	
	case 'bp:SequenceSite': // FIXME
	case 'bp:SequenceInterval':
	case 'bp:SequenceRegionVocabulary': // FIXME
	case 'bp:DnaRegion':
	case 'bp:RnaRegion':

	case 'bp:Protein':
	case 'bp:Catalysis':
	case 'bp:SmallMolecule':
	case 'bp:Complex':
	case 'bp:Rna':

	case 'bp:CellularLocationVocabulary':
	case 'bp:TissueVocabulary':
	case 'bp:EvidenceCodeVocabulary':
	case 'bp:RelationshipTypeVocabulary':
	case 'bp:SequenceModificationVocabulary':
	case 'bp:InteractionVocabulary':
	
	case 'bp:SmallMoleculeReference':
	case 'bp:ProteinReference':
	case 'bp:RnaReference':
	case 'bp:DnaReference':
	case 'bp:RnaRegionReference':
	case 'bp:DnaRegionReference':
	case 'bp:CellVocabulary':
	
	case 'bp:UnificationXref':
	case 'bp:PublicationXref':
	case 'bp:RelationshipXref':
		var T = this.A_tagInfo[e.tagName];
		// Make an array of child tag names
		// Cache childs by their tag name
		var tmp = [];
		var childs = [];
		for (var j=e.firstElementChild ; j ; j=j.nextElementSibling) {
			if (childs[j.tagName] === undefined) childs[j.tagName] = [];
			childs[j.tagName].push(j);
			tmp.push(j.tagName);
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
			for (var j=e.firstElementChild ; j ; j=j.nextElementSibling)
				_.dump_sub(_, j, lv+1);
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
			// Add this entry to the element if store == true
			if (undefined !== T.store && T.store)
				e.ivipData = tmp;
		}
		break;
	default:
		var ret = ' --> [???] '+str+e.tagName+'['+e.id+']';
		if (B_retString) return ret;
		console.log(ret);
		for (var j=e.firstElementChild ; j ; j=j.nextElementSibling)
			_.dump_sub(_, j, lv+1);
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
	for (var i in o) if (o.hasOwnProperty(i)) this.dump_sub(this, o[i]);
	
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
	Lnotice("[[bp3annotate]] called");
	var _ = this;
	
	/* Collect information */
	var annot	= {};
	var res		= {};
	var N_anno	= 0;	/* Number of annotated {Element}s */
	
	/* Categorize annotations */
	Object.keys(A_need2anno).forEach(function(id) {
		var o = A_need2anno[id];
		if (o.db === undefined) {
			Lerror('Invalid XREF ['+id+'] found, its value ['+o.toString()+']');
			return;
		}
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
			$.get('track.php?t=anno&db='+i+'&k='+encodeURIComponent(v.join('|')), function(){});
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
	
	var F_anno = function(I) {
		var anno = [];
		var anno_raw = [];
		if (I.id.substring(0, 4) == 'ivip') return;
		for (var i=I.firstElementChild ; i ; i=i.nextElementSibling) {
			// Only one of them should be annotated
			if (i.tagName == 'bp:entityReference') {
				var N = _.bp3getResource(i);
				var A_anno = anno_sub(_, N?_.A_bp3entry[N]:i.firstElementChild, A_annoResult);
				A_anno[0].forEach(function(K) { anno.push(K); });
				A_anno[1].forEach(function(K) { anno_raw.push(K); });
			} else if (i.tagName == 'bp:xref') anno_xref(_, i, A_annoResult, anno, anno_raw);
		}
		// According to the tag, remove some annotations
		if (_.A_tagInfo[I.tagName] && _.A_tagInfo[I.tagName].annoref !== undefined) {
			var A_newanno = [];
			for (var i=0 ; i<anno.length ; i++)
				if (_.A_tagInfo[I.tagName].annoref.indexOf(anno_raw[i].db) == -1)
					A_newanno.push(anno[i]);
			anno = A_newanno;
		}
		if (!anno.length) {
			var name = _.bp3getName(I);
			if (!name)
				Lwarn('Element ['+I.id+'] does not have displayName nor annotation');
			else
				I.symbol = [ '<<'+name+'>>' ];
		} else
			I.symbol = anno;
		I.ref = anno_raw;
	};
	// Check children
	this.A_node2.forEach(F_anno);
	this.A_nodes.forEach(F_anno);
	//graph_nested(this.A_node2, this.A_edge2);
};

function anno_xref(_, x, A_annoResult, A_res, A_raw) {
	// Assume both entries are existing since we already checked it
	var res = _.bp3getResource(x);
	if (res)
		anno_xref(_, _.A_bp3entry[res], A_annoResult, A_res, A_raw);
	else {
		var _db = x.getElementsByTagNameNS(_.bp,"db");
		var _id = x.getElementsByTagNameNS(_.bp,"id");
		if (!_db.length || !_id.length) return;
		var db = x.getElementsByTagNameNS(_.bp,"db")[0].textContent.toLowerCase();
		var id = x.getElementsByTagNameNS(_.bp,"id")[0].textContent;
		if (undefined === A_annoResult[db] || undefined === A_annoResult[db][id]) {
			Lwarn('Annotation for DB ['+db+'] ID ['+id+'] not found');	
		} else {
			var S_anno = A_annoResult[db][id];
			if (undefined !== S_anno && S_anno.length && S_anno.length > 0) {
				A_res.push(S_anno);
				A_raw.push({db:db,id:id,anno:S_anno});
			}
		}
	}
}

function anno_sub(_, o, A_annoResult) {
	var A_res = [];
	var A_raw = [];
	
	// It should have bp:xref
	for (var i=o.firstElementChild ; i ; i=i.nextElementSibling) {
		if (i.tagName != 'bp:xref') continue;
		anno_xref(_, i, A_annoResult, A_res, A_raw);
	}
	
	return [ A_res, A_raw ];
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
		
		var N_proc = 0;
		var _po = this.bp3getData(H_pw, this.bp, 'pathwayOrder');
		_po.forEach(function(v) {
			switch (v.tagName) {
			case 'bp:BiochemicalPathwayStep':
				/* Check the tag have <bp:stepDirection> */
				var B_L2R = _.bp3procDirection(v, 'stepDirection');

				/* For all childs of <bp:stepProcess> */
				var A_sp = _.bp3getData(v, _.bp, 'stepProcess');
				var A_sc = _.bp3getData(v, _.bp, 'stepConversion');
				if (A_sp.length == 0 && A_sc.length == 0)
					Lerror("No interpretable step found in ["+v.id+"]");
				// BioChemReact first
				Lcmt('BiochemicalPathwayStep ['+v.id+'] has ['+A_sc.length+'] stepConversion');
				A_sc.forEach(function(w) {
					switch (w.tagName) {
					case 'bp:BiochemicalReaction':
					case 'bp:Transport':
						_.bp3procBiochemicalReaction(w, B_L2R); break;
					default:
						Lerror('Non-defined BiochemicalPathwayStep ['+w.tagName+']'); break;
					}
				});
				// Catalysis next
				Lcmt('BiochemicalPathwayStep ['+v.id+'] has ['+A_sp.length+'] stepProcess');
				A_sp.forEach(function(v) {
					_.bp3procCatalysis(v, B_L2R);
				});
				N_proc++;
				break;
			default:
				Lwarn('Uncontrolled pathwayOrder ['+v.tagName+']');
				break;
			}
		});
		/* If no pathwayOrder, do pathwayComponent */
		if (_po.length == 0 || N_proc == 0) this.bp3getData(H_pw, this.bp, 'pathwayComponent').forEach(function(v) {
			_.A_component.push(v);
			switch (v.tagName) {
			case 'bp:Catalysis':
				_.bp3procCatalysis(v);
				break;
			case 'bp:BiochemicalReaction':
				_.bp3procBiochemicalReaction(v);
				break;
			default:
				Lerror('Invalid pathway component ['+v.tagName+']');
				break;
			}
		});
		/* Revisit nodes & edges and correct them by snodeMap */
		_.A_node2.forEach(function(v) {
			if (!v.member||!v.member.length) return;
			for (var i=0; i<v.member.length ; i++) {
				if (_.A_snodeMap[v.member[i].id] !== undefined) {
					var t = _.A_bp3entry[_.A_snodeMap[v.member[i].id]];
					console.log("[MEMB] "+v.member[i].tagName+"["+v.member[i].id+"] -> "+t.tagName+"["+t.id+"]");
					v.member[i] = t;
				}
			}
		});
		_.A_edge2.forEach(function(v) {
			if (_.A_snodeMap[v.from.id] !== undefined) {
				var t = _.A_bp3entry[_.A_snodeMap[v.from.id]];
				console.log("[FROM] "+v.from.tagName+"["+v.from.id+"] -> "+t.tagName+"["+t.id+"]");
				v.from = t;
			}
			if (_.A_snodeMap[v.to.id] !== undefined) {
				var t = _.A_bp3entry[_.A_snodeMap[v.to.id]];
				console.log("[ TO ] "+v.to.tagName+"["+v.to.id+"] -> "+t.tagName+"["+t.id+"]");
				v.to = t;
				if (t.type == 'bcr') {
					console.log("Edge ["+v.from.id+"] -> ["+v.to.id+"] is part of BCR");
					if (v.to.participant === undefined) v.to.participant = [];
					if (v.to.participant.indexOf(v.from) == -1)
						v.to.participant.push(v.from);
				}
			}
		});
		_.A_edge2.forEach(function(v) {
			if (v.to.type == 'bcr') {
				console.log("Edge ["+v.from.id+"] -> ["+v.to.id+"] is part of BCR");
				if (v.to.participant === undefined) v.to.participant = [];
				if (v.to.participant.indexOf(v.from) == -1)
					v.to.participant.push(v.from);
			}
		});
	}
};

pathwayProcessor.prototype.bp3procCatalysis = function(H_ct, B_L2R) {
	/* Check integrity */
	if (!this.bp3check(H_ct, 'Catalysis')) return false;
	
	var	_			= this;
	var res			= [];
	var typeCtrl	= H_ct.getChildTextNS(_.bp, 'controlType');
	var _ctrler		= this.bp3getData(H_ct, this.bp, 'controller');
	var _ctrled		= this.bp3getData(H_ct, this.bp, 'controlled');
	
	// Convert ctrler/ctrled nodes into supernode if mapped
	for (var i=0 ; i<_ctrler.length ; i++)
		if (undefined !== this.A_snodeMap[_ctrler[i].id])
			_ctrler[i] = this.A_bp3entry[this.A_snodeMap[_ctrler[i].id]];
	for (var i=0 ; i<_ctrled.length ; i++)
		if (undefined !== this.A_snodeMap[_ctrled[i].id])
			_ctrled[i] = this.A_bp3entry[this.A_snodeMap[_ctrled[i].id]];
	
	// Create supernode
	if (_ctrler.length > 1) {
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.type = 'cat_ctrler';
		tmp.member = _ctrler;
		_ctrler = [tmp];
		this.A_node2.push(_ctrler[0]);
		this.A_bp3entry[tmp.id] = tmp;
	}
	if (_ctrled.length > 1) {
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.type = 'cat_ctrled';
		tmp.member = _ctrled;
		_ctrled = [tmp];
		this.A_node2.push(_ctrled[0]);
		this.A_bp3entry[tmp.id] = tmp;
	}
	if (_ctrler[0] === undefined)
		Lerror("Undefined controller found");
	else this.A_edge2.push({
		from:_ctrler[0],
		to:_ctrled[0],
		type: 'catalysis'
	});
	// Create supernode of this reaction
	if (0) {
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.origin = H_ct;
		tmp.type = 'cat';
		tmp.member = [_ctrler[0], _ctrled[0]];
		this.A_node2.push(tmp);
		this.A_bp3entry[tmp.id] = tmp;
		this.A_snodeMap[H_ct.id] = tmp.id;
	}

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
	var B_isBCR = this.bp3check(H_br, 'BiochemicalReaction');
	var B_isTSP = this.bp3check(H_br, 'Transport');
	if (!B_isBCR && !B_isTSP) return false;
	var S_label = B_isBCR ? 'BiochemicalReaction' : 'Transport';
	
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
		Lcmt(S_label+" ["+H_br.id+"] -> ["+H_br.type+"]");
	} else
		Lcmt(S_label+" ["+H_br.id+"] do not have interactionType");

	/* Get left & right */
	var _L = this.bp3getData(H_br, this.bp, B_L2R?'left':'right');
	var _R = this.bp3getData(H_br, this.bp, B_L2R?'right':'left');
	/* Both have length? */
	if (!_L.length || !_R.length) {
		Lerror(S_label+" ["+H_br.id+"] do not have left["+_L.length+"] nor right["+_R.length+"]");
		return false;
	}
	Ldebug(S_label+" ["+H_br.id+"] direction ["+(B_L2R?"L->R":"R->L")+"]");

	// Create supernode
	if (_L.length > 1) {
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.type = B_isBCR ? 'bcr_l' : 'tsp_l';
		tmp.member = _L;
		_L = [tmp];
		this.A_node2.push(_L[0]);
		this.A_bp3entry[tmp.id] = tmp;
	}
	if (_R.length > 1) {
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.type = B_isBCR ? 'bcr_r' : 'tsp_r';
		tmp.member = _R;
		_R = [tmp];
		this.A_node2.push(_R[0]);
		this.A_bp3entry[tmp.id] = tmp;
	}
	// Create supernode of this reaction
	var tmp = document.createElement("ivip-node");
	tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
	tmp.origin = H_br;
	tmp.type = B_isBCR ? 'bcr' : 'tsp';
	//WHEN SUPERPNODE CONTAINS ITS MEMBER tmp.member = [_L[0], _R[0]];
	//ELSE
	tmp.member = [];
	this.A_node2.push(tmp);
	this.A_bp3entry[tmp.id] = tmp;
	this.A_snodeMap[H_br.id] = tmp.id;
	
	if (_L[0] === undefined)
		Lerror("Undefined left item found");
	else {
		// WHEN SUPERPNODE CONTAINS ITS MEMBER 
		if (0) {
			this.A_edge2.push({
				from:_L[0],
				to:_R[0]
			});
		} else {
			this.A_edge2.push({
				from:_L[0],
				to:tmp
			});
			this.A_edge2.push({
				from:tmp,
				to:_R[0]
			});
			this.A_origEdge.push({from:_L[0],to:_R[0],by:tmp});
		}
	}
	return true;
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
	Lnotice("[[bp3getEdges]] called");
	var _ = this;
	var xml = this.xml();
	var ret = [];
	this.bp3procPathway(xml.getElementsByTagNameNS(_.bp, 'Pathway'));
	if (0) {
		// REMOVE REDUNDANT BIOCHEMREACT
		var K={};
		for (var i in this.A_snodeMap)
			if (this.A_snodeMap.hasOwnProperty(i)) K[this.A_snodeMap[i]] = true;
		this.A_edge2.forEach(function(I) {
			if (I.from.ivipVisit === undefined) I.from.ivipVisit = 0;
			if (I.to.ivipVisit === undefined) I.to.ivipVisit = 0;
			I.from.ivipVisit++;
			I.to.ivipVisit++;
		});
		Object.keys(this.A_bp3entry).forEach(function(i) {
			var v = _.A_bp3entry[i];
			if (K[v.id] === undefined || v.ivipVisit === undefined) return;
			if (v.ivipVisit == 2) delete K[v.id];
		});
		var KK = Object.keys(K);
		if (KK.length) {
			var A_nedge = [], ne=0, nr=0;
			var A_nnode = [], nn=0;
			// Remove nodes I
			_.A_node2.forEach(function(J) { if (K[J.id] === undefined) A_nnode.push(J); else nn++; });
			// Remove edges include I
			_.A_edge2.forEach(function(J) { if (K[J.from.id] === undefined && K[J.to.id] === undefined) A_nedge.push(J); else ne++; });
			// Add origEdge if by == I
			_.A_origEdge.forEach(function(J) { if (K[J.by.id] !== undefined) { A_nedge.push(J); nr++; } });
			console.log("["+KK.length+"] supernodes will be removed from the graph, ["+nn+"] nodes and ["+ne+"] edges were removed, and ["+nr+"] edges were recovered");
			this.A_edge2 = A_nedge;
			this.A_node2 = A_nnode;
			// FIXME : A_node2 does not reflected to the visualization
		}
		//console.log(Object.keys(K));
	}
	return this.A_edge2;
}

pathwayProcessor.prototype.bp3getSuperNodeId = function() {
//	Lnotice("Supernode ["+this.N_idSuper+"] requested");
	return this.N_idSuper++;
};

pathwayProcessor.prototype.bp3getNodes = function(xml) {
	Lnotice("[[bp3getNodes]] called");
	var _ = this;
	_.A_edge2 = [];
	_.A_origEdge = [];
	_.A_node2 = [];
	_.A_snodeMap = {};
	_.N_idSuper = 1;
	
	var A_target = this.bp3getElementsByTagNames('Protein', 'SmallMolecule', 'Complex');
	this.A_nodes = [];
	A_target.forEach(function(v) {
		// Single-entity complex == single 
		if (v.tagName == 'bp:Complex') {
			var A_comp = _.bp3getData(v, _.bp, "component");
			if (A_comp.length == 1) {
				Lnotice("bp:Complex ["+v.id+"] has one component, altered to "+A_comp[0].tagName+" ["+A_comp[0].id+"]");
				// Overwrite supernode map and entry map to the single entry
				A_comp[0].origin = v;
				_.A_snodeMap[v.id] = A_comp[0].id;
				_.A_bp3entry[v.id] = A_comp[0];
				v = A_comp[0];
			}
		}
		switch (v.tagName) {
	case 'bp:Complex':
		var A_comp = _.bp3getData(v, _.bp, "component");
		// Make supernode
		var tmp = document.createElement("ivip-node");
		tmp.id = 'ivipSuperNode'+_.bp3getSuperNodeId();
		tmp.origin = v;
		tmp.type = 'cpx';
		tmp.member = A_comp;
		_.A_node2.push(tmp);
		_.A_snodeMap[v.id] = tmp.id;
		_.A_bp3entry[v.id] = tmp;
		_.A_bp3entry[tmp.id] = tmp;
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
		if (_.A_node2.indexOf(v) == -1) _.A_node2.push(v);
		v.type		= v.localName=='Protein' ? 'gene' : 'compound';
		_.A_nodes.push(v);
		break;
	default:
		Lerror('Unexpected node tag ['+v.tagName+']');
		break;
	} });
	
	return this.A_node2;
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
	'refmet':				['anno/asis.php', '|'],
	'biocyc':				['anno/asis.php', '|'],
	'humancyc':				['anno/asis.php', '|'],
	'wikipedia':			['anno/asis.php', '|', 'Wikipedia', 'https://en.wikipedia.org/wiki/'],

	'entrez gene':			['anno/pair.php', '|', 'Entrez', 'https://www.ncbi.nlm.nih.gov/gene/'],
	'entrezgene':			['anno/pair.php', '|', 'Entrez', 'https://www.ncbi.nlm.nih.gov/gene/'],
	'entrez':				['anno/pair.php', '|', 'Entrez', 'https://www.ncbi.nlm.nih.gov/gene/'],
	'cas':					['anno/pair.php', '|', 'CAS', 'http://webbook.nist.gov/cgi/cbook.cgi?ID='],
	'pharmgkb':				['anno/pair.php', '|', 'PharmGKB', 'https://www.pharmgkb.org/chemical/'],
	'interpro':				['anno/pair.php', '|', 'InterPro', 'https://www.ebi.ac.uk/interpro/entry/'],
	'pfam':					['anno/pair.php', '|', 'Pfam', 'http://pfam.xfam.org/family/'],
	'prosite':				['anno/pair.php', '|', 'prosite', 'https://prosite.expasy.org/'],
	'prints':				['anno/pair.php', '|'],
	'taxonomy':				['anno/pair.php', '|', 'ncbi', 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='],
	'ncbi taxonomy':		['anno/pair.php', '|', 'ncbi', 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='],
	'ncbitaxon':			['anno/pair.php', '|', 'ncbi', 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='],
	'omim':					['anno/pair.php', '|'],
	'hprd':					['anno/pair.php', '|'],
	'eco':					['anno/pair.php', '|'],
	'evidence code ontology':['anno/pair.php', '|'],
	'enzyme nomenclature':	['anno/pair.php', '|'],
	'go':					['anno/pair.php', '|'],
	'gene ontology':		['anno/pair.php', '|'],
	'psi-mod':				['anno/pair.php', '|'],
	'lipid maps':			['anno/pair.php', '|'],
	'mirbase sequence':		['anno/pair.php', '|'],
	'protein data bank':	['anno/pair.php', '|', 'PDB', 'https://www.rcsb.org/pdb/explore/explore.do?structureId='],
	

	'pathwhiz':			['pathwhiz2pathwayname.php', '|'],
	'smpdb':			['smpdb2pathwayname.php', '|'],
	'pubmed':			['pmid2info.php', ' ', 'PubMed', 'https://www.ncbi.nlm.nih.gov/pubmed/'],
	'kegg compound':	['compoundid2compoundname.php', ' ', 'KEGG', 'http://www.genome.jp/dbget-bin/www_bget?cpd:'],
	'kegg ligand':		['compoundid2compoundname.php', ' ', 'KEGG', 'http://www.genome.jp/dbget-bin/www_bget?cpd:'],
	'pubchem-compound':	['pubchemcompoundid2compoundname.php', '|'],
	'reactome database id release 62':
						['reactome2pathwayname.php', '|'],
//	'gene ontology':	['go2pathwayname.php', '|'],

	uniprot:		['uniprot2genesymbol.php', '|'],
	keggligand:		['compoundid2compoundname.php', ' '],
	cpd:			['compoundid2compoundname.php', ' '],
	pubchemcompound:['pubchemcompoundid2compoundname.php', '|'],
	knapsack:		['knapsackid2compoundname.php', '|'],
	'hmdb':			['hmdbid2compoundname.php', '|', 'HMDB', 'http://www.hmdb.ca/metabolites/'],
	chebi:			['chebi2compoundname.php', '|', 'ChEBI', 'http://www.ebi.ac.uk/chebi/searchId.do?chebiId='],
	ensembl:		['ensemblid2genesymbol.php', '|'],
	chemspider:		['chemspider2compoundname.php', '|'],
};

