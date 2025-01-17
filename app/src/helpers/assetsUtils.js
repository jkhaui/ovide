/**
 * This module provides utils related to the test and loading of assets' data
 * @module ovide/utils/assetsUtils
 */

import { get } from 'axios';
import exif from 'exif-js';
import { flatten } from 'lodash';

import { v4 as genId } from 'uuid';

import Cite from 'citation-js';

import {
  convertToRaw,
  Modifier,
  EditorState,
} from 'draft-js';

import {
  insertInlineContextualization,
  insertBlockContextualization,
  getTextSelection
} from './draftUtils';

import {
  constants
} from 'scholar-draft';
const {
  BLOCK_ASSET,
  INLINE_ASSET,
} = constants;

export const blobToBase64 = ( blob ) => {
  return new Promise( ( resolve, reject ) => {
     const reader = new FileReader();
     reader.readAsDataURL( blob );
     reader.onloadend = function() {
         const base64data = reader.result;
         resolve( base64data );
     };
     reader.onerror = reject;
  } );
};

export const blobToJSON = ( blob ) => {
  return new Promise( ( resolve, reject ) => {

    const reader = new FileReader();
    reader.onload = function() {
        const str = reader.result;
        try {
          const data = JSON.parse( str );
          resolve( data );
        }
 catch ( error ) {
          reject( error );
        }
    };
    reader.readAsText( blob );
     reader.onerror = reject;
  } );
};

export const b64toBlob = ( b64Data, contentType, sliceSize ) => {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;
  let byteCharacters;
  try {
    byteCharacters = atob( b64Data );
  }
 catch ( e ) {
    return new Blob( [], { type: contentType } );
  }

  const byteArrays = [];

  for ( let offset = 0; offset < byteCharacters.length; offset += sliceSize ) {
    const slice = byteCharacters.slice( offset, offset + sliceSize );

    const byteNumbers = new Array( slice.length );
    for ( let i = 0; i < slice.length; i++ ) {
      byteNumbers[i] = slice.charCodeAt( i );
    }

    const byteArray = new Uint8Array( byteNumbers );

    byteArrays.push( byteArray );
  }

  const blob = new Blob( byteArrays, { type: contentType } );
  return blob;
};

export const convertBlobAssetToPreviewData = ( blobBuffer, mimetype ) => {
  switch ( mimetype ) {
    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/gif':
    case 'image/tiff':
      return blobToBase64( blobBuffer )
              .then( ( raw ) => Promise.resolve( raw.replace( 'application/octet-stream', mimetype ) ) )
              .catch( ( e ) => Promise.reject( e ) );

    case 'application/json':
    case 'text/csv':
    case 'text/tsv':
    case 'text/comma-separated-values':
    case 'text/tab-separated-values':
      return new Promise( ( resolve, reject ) => {
        blobToJSON( blobBuffer )
          .then( ( data ) => {
            resolve( data );
          } )
          .catch( reject );
      } );
    case 'text/plain':
    case 'text/html':
    default:
      return Promise.resolve( blobBuffer );
  }
};

export const getRelatedAssetsIds = ( obj = {} ) => {
  if ( obj ) {
    return flatten(
      Object.keys( obj )
      .reduce( ( results, key ) => {
        const val = obj[key];
        const iterableResults = Array.isArray( results ) ? results : [];
        if ( Array.isArray( val ) ) {
          const newKeys = flatten( val.map( getRelatedAssetsIds ) );
          return [
          ...iterableResults,
          newKeys
          ];
        }
        else if ( typeof val === 'object' ) {
          const newKeys = flatten( getRelatedAssetsIds( val ) );
          return [ ...iterableResults, newKeys ];
        }
        else if ( key.includes( 'AssetId' ) ) {
          return [ ...iterableResults, val ];
        }
        return iterableResults;
      }, [] )
    );
  }
  return [];
};

/**
 * Checks whether a file is an image that can be loaded in base64 later on
 * todo: could be improved
 * @param {File} file - the file to check
 * @return {Promise} process - checking is wrapped in a promise for consistence matters
 */
export const fileIsAnImage = ( file ) => {
  return new Promise( ( resolve, reject ) => {
    const validExtensions = [ 'gif', 'png', 'jpeg', 'jpg' ];
    const extension = file.name.split( '.' ).pop();
    if ( validExtensions.indexOf( extension ) > -1 ) {
      resolve( file );
    }
    else {
      reject();
    }
  } );
};

/**
 * Checks whether a given url links toward a video service which is handled by the app
 * todo: could be improved
 * @param {string} url - the url to check
 * @return {Promise} process - checking is wrapped in a promise for consistence matters
 */
export const videoUrlIsValid = ( url ) => {
  return new Promise( ( resolve, reject ) => {
    const validUrlParts = [ 'youtu', 'vimeo' ];
    const hasMatch = validUrlParts.some( ( exp ) => url.match( exp ) !== null );
    if ( hasMatch ) {
      resolve( url );
    }
    else {
      reject();
    }
  } );
};

/**
 * Forces the orientation of a base64 image
 * @param {string} srcBase64 - base64 representation
 * @param {number} srcOrientation - exif orientation code
 */
const resetOrientation = ( srcBase64, srcOrientation ) => {
  return new Promise( ( resolve, reject ) => {
    const img = new Image();

    img.onload = function() {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement( 'canvas' );
      const ctx = canvas.getContext( '2d' );

      // set proper canvas dimensions before transform & export
      if ( srcOrientation > 4 && srcOrientation < 9 ) {
        canvas.width = height;
        canvas.height = width;
      }
      else {
        canvas.width = width;
        canvas.height = height;
      }

      // transform context before drawing image
      switch ( srcOrientation ) {
        case 2: ctx.transform( -1, 0, 0, 1, width, 0 ); break;
        case 3: ctx.transform( -1, 0, 0, -1, width, height ); break;
        case 4: ctx.transform( 1, 0, 0, -1, 0, height ); break;
        case 5: ctx.transform( 0, 1, 1, 0, 0, 0 ); break;
        case 6: ctx.transform( 0, 1, -1, 0, height, 0 ); break;
        case 7: ctx.transform( 0, -1, -1, 0, height, width ); break;
        case 8: ctx.transform( 0, -1, 1, 0, 0, width ); break;
        default: break;
      }

      // draw image
      ctx.drawImage( img, 0, 0 );

      // export base64
      resolve( canvas.toDataURL() );
    };

    img.src = srcBase64;
  } );

};

/**
 * Fetches exif data out of a base64-represented image
 */
const getExifOrientation = ( base64 ) => {
  return new Promise( ( resolve, reject ) => {
    const img = new Image();

    img.onload = function() {
      try {
        exif.getData( img, function() {
            const orientation = exif.getTag( this, 'Orientation' );
            if ( orientation ) {
              resolve( orientation );
            }
            else resolve();
        } );
      }
 catch ( e ) {
        resolve();
      }
    };

    img.src = base64;
  } );
};

/**
 * Loads an image file in base64
 * todo: could be improved
 * @param {File} file - the file to load
 * @return {Promise} process - loading is wrapped in a promise for consistence matters
 */
export const loadImage = ( file ) => {
  return new Promise( ( resolve, reject ) => {
    let reader = new FileReader();
    reader.onload = ( event ) => {
      const base64 = event.target.result;
      getExifOrientation( base64 )
      .then( ( orientation ) => {
        if ( orientation ) {
          return resetOrientation( base64, orientation );
        }
        else {
          return resolve( base64 );
        }
      } )
      .then( ( newBase64 ) => resolve( newBase64 ) )
      .catch( console.error ); /* eslint no-console : 0 */

      reader = undefined;
    };
    reader.onerror = ( event ) => {
      reject( event.target.error );
      reader = undefined;
    };
    reader.readAsDataURL( file );
  } );
};

/**
 * Loads a json data from static url
 * todo: could be improved
 * @param {url} static url
 * @return {Promise} process - loading is wrapped in a promise for consistence matters
 */
export const loadResourceData = ( url ) => {
  return new Promise( ( resolve ) => {
    get( url )
    .then( ( res ) => {
      resolve( res.data );
    } );
  } );
};

/**
 * Retrieves the metadata associated with a given webpage resource from its source code
 * @param {string} url - the url to start from to know where to retrieve the metadata
 * @return {Promise} process - loading is wrapped in a promise for consistence matters
 */
export const retrieveWebpageMetadata = ( url ) => {
  return new Promise( ( resolve ) => {
    if ( url.length ) {
      get( url )
        .then( ( { data: html } ) => {
          try {
            let title = /\<title\>(.+)\<\/title\>/.exec( html );
            title = title && title[1];
            let description = /\<meta\s+content="([^"]+)"\s+name="description"\s*\/\>/.exec( html )
              || /\<meta\s+name="description"\s+content="([^"]+)"\s*\/\>/.exec( html );
            description = description && description[1];
            let authors = /\<meta\s+content="([^"]+)"\s+name="author"\s*\/\>/.exec( html )
              || /\<meta\s+name="author"\s+content="([^"]+)"\s*\/\>/.exec( html );
            authors = authors && authors[1];
            authors = authors && [ authors ];
            resolve( {
              title,
              description,
              authors
            } );

          }
          catch ( e ) { /* eslint no-unused-vars : 0 */
            resolve( {} );
          }
        } )
        .catch( ( e ) => {
          resolve( {} );
        } );
    }
    else {
      resolve( {} );
    }
  } );
};

const youtubeRegexp = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/gi;
const vimeoRegexp = /^(https?\:\/\/)?(www\.)?(vimeo\.com)/gi;

/**
 * Retrieves the metadata associated with a given media resource from its source (youtube or vimeo only for now)
 * @param {string} url - the url to start from to know where to retrieve the metadata
 * @param {object} credentials - potential api keys to be used by the function
 * @return {Promise} process - loading is wrapped in a promise for consistence matters
 */
export const retrieveMediaMetadata = ( url, credentials = {} ) => {
  return new Promise( ( resolve, reject ) => {
    // case youtube
    if ( url.match( youtubeRegexp ) ) {
      // must provide a youtube simple api key
      if ( credentials.youtubeAPIKey ) {
        let videoId = url.match( /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/ );
        if ( videoId !== null ) {
           videoId = videoId[1];
           // for a simple metadata retrieval we can use this route that includes the api key
            const endPoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${credentials.youtubeAPIKey}`;
            get( endPoint )
            .then( ( res ) => {
              const info = res.data && res.data.items && res.data.items[0] && res.data.items[0].snippet;
              return resolve( {
                  url,
                  metadata: {
                    description: info.description,
                    source: `${info.channelTitle } (youtube: ${url})`,
                    title: info.title,
                    videoUrl: url,
                    authors: [ info.channelTitle ]
                  }
                } );
            } )
            .catch( ( e ) => reject( e ) );
        }
        else {
          return resolve( { url, metadata: {
          videoUrl: url
        } } );
        }
      }
      else {
        return resolve( { url, metadata: {
          videoUrl: url
        } } );
      }
    }
    // case vimeo: go through the oembed endpoint of vimeo api
    else if ( url.match( vimeoRegexp ) ) {
      const endpoint = `https://vimeo.com/api/oembed.json?url=${ url}`;
      get( endpoint )
      .then( ( res ) => {
        const data = res.data;
        resolve( {
          url,
          metadata: {
            source: `${data.author_name } (vimeo: ${url})`,
            title: data.title,
            description: data.description,
            videoUrl: url
          }
        } );
      } )
      .catch( ( e ) => reject( e ) );
    }
    // default - do nothing
    else {
      return resolve( { url, metadata: {
        videoUrl: url
      } } );
    }
  } );
};

/**
 * Converts bibtex data to csl-json in a secure way
 * (if not splitting all the refs in separate objects,
 * a single error blows the whole conversion process with citation-js.
 * This is a problem as for instance zotero bibTeX output
 * generates a lot of errors as it is not standard bibTeX).
 * @todo: comply to zotero-flavoured & mendeley-flavoured bibtex formatting
 * (see https://github.com/citation-style-language/schema/wiki/Data-Model-and-Mappings)
 * @param {string} str - input bibTeX-formatted string
 * @return {array} references - a list of csl-json formatted references
 */
export const parseBibTeXToCSLJSON = ( str ) => {
  // forcing references separation to parse a maximum of references, even with shitty formatting
  const refs = str.split( '\n\n' );
  return refs.reduce( ( result, ref ) => {
    return [
      ...result,
      ...new Cite( ref ).get( {
        type: 'json',
        style: 'csl'
      } )
    ];
  }, [] );
};

/**
 * Retrieves metadata from the data of a resource, when possible
 * @param {object} data - the data of the resource
 * @param {string} assetType - the type of asset that is parsed
 * @return {object} metadata - information to merge with preexisting metadata
 */
export const inferMetadata = ( data, assetType ) => {
  switch ( assetType ) {
    case 'video':
      if ( data.metadata ) {
        return { ...data.metadata };
      }
      return {};
    case 'data-presentation':
      return { ...data.json.metadata };
    case 'image':
    case 'table':
      const title = data && data.filename && data.filename.split( '.' ).reverse().slice( 1 ).reverse().join( '.' );

      return {
        title,
      };
    default:
      return {};
  }
};

/**
 * Handle the process of creating a new asset in a production content.
 * This implies three operations :
 * - create a contextualizer (which defines a way of materializing the resource)
 * - create contextualization (unique combination of a contextualizer, a section and a resource)
 * - insert an entity linked to the contextualization in the proper draft-js content state (main or note of the section)
 * @param {string} contentId - the id of editor to target ('main' or note id)
 * @param {string} resourceId - id of the resource to summon
 */
export const summonAsset = ( contentId, resourceId, props, config ) => {
    const {
      editedProduction: production,
      editorStates,
      actions,
      match: {
        params: {
          sectionId,
        },
      },
      userId,
    } = props;

    const {
      id: productionId
    } = production;

    const {
      createContextualizer,
      createContextualization,
      updateDraftEditorState,
      updateSection,
      setEditorFocus,
    } = actions;
    const { contextualizers } = config;

    const activeSection = production.sections[sectionId];
    const resource = production.resources[resourceId];

    const editorStateId = contentId === 'main' ? sectionId : contentId;
    const editorState = editorStates[editorStateId];

    /*
     * choose if inline or block
     * todo: for now we infer from the resource type whether contextualization
     * must be in block or inline mode.
     * but we could choose to let the user decide
     * (e.g. 1: a 'bib' reference in block mode
     * could be the full reference version of the reference)
     * (e.g. 2: a 'quinoa presentation' reference in inline mode
     * could be an academic-like short citation of this reference)
     */
    const selection = editorState.getSelection();
    const content = editorState.getCurrentContent();
    const isCollapsed = selection.isCollapsed();
    // const insertionType = [ 'bib', 'glossary', 'webpage' ].indexOf( resource.metadata.type ) > -1 ? 'inline' : 'block';
    let insertionType;
    if ( isCollapsed ) {
      const selectionAnchor = selection.getAnchorKey();
      const anchorBlock = content.getBlockForKey( selectionAnchor );
      if ( anchorBlock.getText().trim().length === 0 ) {
        insertionType = BLOCK_ASSET;
      }
      else {
        insertionType = INLINE_ASSET;
      }
    }
    else {
      insertionType = INLINE_ASSET;
    }

    /**
     * @todo systematize that in schemas, this is a hack
     */
    if ( resource.metadata.type === 'glossary' ) {
      insertionType = INLINE_ASSET;
    }
    const iType = insertionType === INLINE_ASSET ? 'inline' : 'block';

    // determine appropriate contextualizer
    let contextualizerType = resource.metadata.type;
    const naturalContextualizer = contextualizers[resource.metadata.type];
    if ( naturalContextualizer && naturalContextualizer.meta.profile[iType] ) {
      contextualizerType = naturalContextualizer.meta.id;
    }
    else {
      Object.keys( contextualizers ).some( ( id ) => {
        const { meta } = contextualizers[id];
        const { acceptedResourceTypes } = meta;
        const passes = acceptedResourceTypes.find( ( el ) => {
          if ( el.test ) {
            const testResult = el.test( resource );
            return testResult;
          }
          else if ( el.type ) {
            return el.type === resource.metadata.type;
          }
        } );
        if ( passes !== undefined && meta.profile[iType] ) {
          contextualizerType = id;
          return true;
        }
      } );
    }

    // get selected text
    const selectedText = getTextSelection( editorState.getCurrentContent(), editorState.getSelection() );
    // console.log('selected text', selectedText);
    /*
     * 1. create contextualizer
     * question: why isn't the contextualizer
     * data directly embedded in the contextualization data ?
     * answer: that way we can envisage for the future to
     * give users a possibility to reuse the same contextualizer
     * for different resources (e.g. comparating datasets)
     * and we can handle multi-modality in a smarter way.
     */

    // todo : consume model to do that
    const contextualizerId = genId();
    const contextualizer = {
      id: contextualizerId,
      type: contextualizerType,
    };

    // 2. create contextualization
    const contextualizationId = genId();
    const contextualization = {
      id: contextualizationId,
      resourceId,
      contextualizerId,
      sectionId
    };
    // console.log( 'future contextualization', contextualization );

    // 3. update the proper editor state

    let newEditorState = editorState;

    let isMutable = false;
    let selectedDisplacement;
    if ( insertionType === INLINE_ASSET ) {
      selectedDisplacement = selectedText.length;
      // if selection is empty we add placeholder text
      if ( selectedText.length === 0 ) {
        let placeholderText;
        switch ( resource.metadata.type ) {
          case 'glossary':
            placeholderText = resource.data.name;
            isMutable = true;
            break;
          case 'webpage':
            placeholderText = resource.metadata.title;
            isMutable = true;
            break;
          case 'bib':
          default:
            placeholderText = ' ';
            break;
        }
        const newContentState = Modifier.replaceText(
          newEditorState.getCurrentContent(),
          editorState.getSelection(),
          placeholderText
        );
        newEditorState = EditorState.push( newEditorState, newContentState, 'replace-text' );
        selectedDisplacement = placeholderText.length;
        newEditorState = EditorState.forceSelection(
          newEditorState,
          newEditorState.getSelection().merge( {
            anchorOffset: newEditorState.getSelection().getStartOffset() - selectedDisplacement
          } )
        );
      }
    }

    // update related editor state
    newEditorState = insertionType === BLOCK_ASSET ?
      insertBlockContextualization( newEditorState, contextualization, contextualizer, resource ) :
      insertInlineContextualization( newEditorState, contextualization, contextualizer, resource, isMutable );

    // update serialized editor state
    let newSection;
    if ( contentId === 'main' ) {
      newSection = {
        ...activeSection,
        contents: convertToRaw( newEditorState.getCurrentContent() )
      };
    }
    else {
      newSection = {
        ...activeSection,
        notes: {
          ...activeSection.notes,
          [contentId]: {
            ...activeSection.notes[contentId],
            contents: convertToRaw( newEditorState.getCurrentContent() )
          }
        }
      };
    }

    // chain creation operations
    return new Promise( ( resolve, reject ) => {
      createContextualizer( { productionId, contextualizerId, contextualizer, userId }, ( err ) => {
        if ( err ) {
          return reject( err );
        }
        else return resolve();
      } );
    } )
    .then( () =>
      new Promise( ( resolve, reject ) => {
        createContextualization( { productionId, contextualizationId, contextualization, userId }, ( err ) => {
          if ( err ) {
            return reject( err );
          }
          else return resolve();
        } );
      } )
    )
    .then( () =>
      new Promise( ( resolve, reject ) => {
        // update immutable editor state
        updateSection( { productionId, sectionId, section: newSection, userId }, ( err ) => {
          if ( err ) {
            return reject( err );
          }
          else {
            setEditorFocus( undefined );
            setTimeout( () => setEditorFocus( contentId ) );
            updateDraftEditorState( editorStateId, newEditorState );
            return resolve();
          }
        } );

      } )
    )
    .catch( console.error );
  };

export const deleteContextualizationFromId = ( {
  contextualization,
  editorStates,
  updateDraftEditorState,
  updateSection,
  section,
} ) => {
    const { id } = contextualization;
    let entityKey;
    let entity;
    let eData;
    let newEditorState;
    let contentId;

    /*
     * we dont know in advance for sure which editor is target by the contextualization
     * so we iterate through main editor state + notes editor states
     * (we could guess it but this is more safe)
     */
    Object.keys( editorStates )
      .find( ( key ) => {
        const editorState = editorStates[key];
        let found;
        const contentState = editorState.getCurrentContent();

        /*
         * we need to iterate through all blocks
         * find = stop when found (even if we do not care about the returned value)
         */
        contentState.getBlockMap().find( ( thatBlock ) => {
          // iterate through each character
          return thatBlock.getCharacterList().find( ( char ) => {
            // if there is an entity
            if ( char.entity ) {
              entityKey = char.entity;
              entity = contentState.getEntity( entityKey );
              eData = entity.toJS();
              // and if the entity is the right one
              if ( eData.data && eData.data.asset && eData.data.asset.id === id ) {
                found = true;
                // then find total entity range
                thatBlock.findEntityRanges(
                  ( metadata ) => {
                    return metadata.getEntity() === entityKey;
                  },
                  // ounce found
                  ( start, end ) => {
                    // delimitate its selection
                    const selectionState = editorState.getSelection().merge( {
                      anchorKey: thatBlock.getKey(),
                      focusKey: thatBlock.getKey(),
                      anchorOffset: start,
                      focusOffset: end,
                    } );
                    // and remove entity from this range
                    newEditorState = EditorState.push(
                      editorState,
                      Modifier.applyEntity(
                        contentState,
                        selectionState,
                        null
                      ),
                      'remove-entity'
                    );
                    // then update
                    contentId = key;
                    if ( newEditorState && contentId ) {
                      // apply change
                      const newSection = contentId === 'main' ? {
                        ...section,
                        contents: convertToRaw( newEditorState.getCurrentContent() )
                      } : {
                        ...section,
                        notes: {
                          ...section.notes,
                          [contentId]: {
                            ...section.notes[contentId],
                            contents: convertToRaw( newEditorState.getCurrentContent() )
                          }
                        }
                      };
                      // update section
                      updateSection( newSection );
                      if ( typeof updateDraftEditorState === 'function' ) {
                        // update real time editor state
                        updateDraftEditorState( contentId, newEditorState );
                      }
                    }
                  }
                );

                return true;
              }
            }

          } );
        } );
        return found;
      } );
  };

  export const removeContextualizationReferenceFromRawContents = ( contents, contId ) => {
      let changed;
      const newContents = Object.keys( contents.entityMap ).reduce( ( result, entityKey ) => {
        const entity = contents.entityMap[entityKey];
        // console.log('parsing', entityKey, 'contents are', result.entityMap);
        if ( ( entity.type === BLOCK_ASSET || entity.type === INLINE_ASSET ) && entity.data && entity.data.asset && entity.data.asset.id === contId ) {
          // console.log('found', entityKey);
          changed = true;
          return {
            blocks: result.blocks.map( ( block ) => {
              if ( block.type === 'atomic' && block.entityRanges.find( ( range ) => range.key === entityKey ) ) {
                return undefined;
              }
              return {
                ...block,
                entityRanges: block.entityRanges.filter( ( range ) => {
                  return contents.entityMap[range.key] && range.key !== entityKey;
                 } )
              };
            } ).filter( ( b ) => b ),
            entityMap: Object.keys( result.entityMap ).reduce( ( newMap, thatEntityKey ) => {
              // console.log('comparing', thatEntityKey, entityKey, thatEntityKey === entityKey);
              if ( thatEntityKey === entityKey ) {
                // console.log('excluding', entityKey)
                return newMap;
              }
              return {
                ...newMap,
                [thatEntityKey]: result.entityMap[thatEntityKey]
              };
            }, {} )
          };
        }
        return result;
      }, { ...contents } );

      return { result: newContents, changed };
    };

export const cleanUncitedNotes = ( section ) => {
  const { notesOrder, notes } = section;
  const newNotes = { ...notes };
  Object.keys( newNotes ).forEach( ( noteId ) => {
    if ( notesOrder.indexOf( noteId ) === -1 ) {
      delete newNotes[noteId];
    }
  } );
  return newNotes;
};
export const deleteUncitedContext = ( sectionId, props ) => {
  const {
    editedProduction,
    userId,
    actions: {
      deleteContextualizer,
      deleteContextualization,
      updateSection
    }
  } = props;

  const { id: productionId } = editedProduction;
  const cleanedSection = {
    ...editedProduction.sections[sectionId],
    notes: cleanUncitedNotes( editedProduction.sections[sectionId] )
  };
  updateSection( { productionId, sectionId, section: cleanedSection, userId } );

  const citedContextualizationIds = Object.keys( cleanedSection.notes ).reduce( ( contents, noteId ) => [
    ...contents,
    editedProduction.sections[sectionId].notes[noteId].contents,
  ], [ editedProduction.sections[sectionId].contents ] )
  .reduce( ( entities, contents ) =>
    [
      ...entities,
      ...Object.keys( contents && contents.entityMap || {} ).reduce( ( localEntities, entityId ) => {
        const entity = contents.entityMap[entityId];
        const isContextualization = entity.type === INLINE_ASSET || entity.type === BLOCK_ASSET;
        if ( isContextualization ) {
          return [ ...localEntities, entity.data.asset.id ];
        }
        return localEntities;
      }, [] )
    ],
  [] );
  const uncitedContextualizations = Object.keys( editedProduction.contextualizations )
                                        .map( ( id ) => editedProduction.contextualizations[id] )
                                        .filter( ( contextualization ) => {
                                          return contextualization.sectionId === sectionId && citedContextualizationIds.indexOf( contextualization.id ) === -1;
                                        } );
  uncitedContextualizations.forEach( ( contextualization ) => {
    const { contextualizerId, id: contextualizationId } = contextualization;
    deleteContextualization( { productionId, contextualizationId, userId } );
    deleteContextualizer( { productionId, contextualizerId, userId } );
  } );
};
