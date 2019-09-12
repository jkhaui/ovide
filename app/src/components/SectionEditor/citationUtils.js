/**
 * This module provides utils for manipulating citations in the editor
 * @module ovide/components/SectionEditor
 */
import {
  constants
} from 'scholar-draft';

import { resourceToCslJSON } from 'peritext-utils';

import defaultStyle from 'raw-loader!./assets/apa.csl';
import defaultLocale from 'raw-loader!./assets/english-locale.xml';

const { INLINE_ASSET, BLOCK_ASSET } = constants;

/**
 * Retrieve proper citation styling models from a production
 * @return {object} proper models
 */
export const getCitationModels = ( production ) => {
  const style = ( production &&
                          production.settings &&
                          production.settings.citationStyle &&
                          production.settings.citationStyle.data
                        )
                          || defaultStyle;
    const locale = ( production &&
                          production.settings &&
                          production.settings.citationLocale &&
                          production.settings.citationLocale.data
                        )
                          || defaultLocale;
  return { style, locale };
};

/**
 * Builds citation data for react-citeproc
 * @return {object} formatted data
 */
export const buildCitations = ( assets, props ) => {
  const {
    production: {
      contextualizations,
      // resources,
      contextualizers
    },
    activeSection
  } = props;

    /*
     * Citations preparation
     */
    // isolate all contextualizations quoted inside editors
    const quotedEntities = activeSection.notesOrder.reduce( ( contents, noteId ) => [
      ...contents,
      activeSection.notes[noteId].contents,
    ], [ activeSection.contents ] )
    .reduce( ( entities, contents ) =>
      [
        ...entities,
        ...Object.keys( contents && contents.entityMap || {} ).reduce( ( localEntities, entityId ) => {
          const entity = contents.entityMap[entityId];
          const isContextualization = entity.type === INLINE_ASSET || entity.type === BLOCK_ASSET;
          if ( isContextualization && assets && assets[entity.data.asset.id] ) {
            return [ ...localEntities, entity.data.asset.id ];
          }
          return localEntities;
        }, [] )
      ],
    [] );
    // isolate bib contextualizations
    const bibContextualizations = quotedEntities
    .filter( ( assetKey ) =>
        assets[assetKey].type === 'bib'
        && assets[assetKey].sectionId === activeSection.id
      )
    .map( ( assetKey ) => assets[assetKey] );

    // build citations items data
    const citationItems = Object.keys( bibContextualizations )
      .reduce( ( finalCitations, key1 ) => {
        const bibCit = bibContextualizations[key1];
        const citations = [
          ...resourceToCslJSON( bibCit.resource ),
          ...( bibCit.additionalResources ? bibCit.additionalResources.map( ( res ) => resourceToCslJSON( res ) ) : [] )
        ].flat();
        const newCitations = citations.reduce( ( final2, citation ) => {
          return {
            ...final2,
            [citation.id]: citation
          };
        }, {} );
        return {
          ...finalCitations,
          ...newCitations,
        };
      }, {} );

    // build citations's citations data
    const citationInstances = bibContextualizations // Object.keys(bibContextualizations)
      .map( ( bibCit, index ) => {
        const key1 = bibCit.id;
        const contextualization = contextualizations[key1];
        const targets = [
          ...resourceToCslJSON( bibCit.resource ),
          ...( bibCit.additionalResources ? bibCit.additionalResources.map( ( res ) => resourceToCslJSON( res ) ) : [] )
        ].flat();
        const contextualizer = contextualizers[contextualization.contextualizerId];
        // const resource = resources[contextualization.resourceId];
        return {
          citationID: key1,
          citationItems: targets.map( ( ref ) => ( {
            locator: contextualizer.locator,
            prefix: contextualizer.prefix,
            suffix: contextualizer.suffix,
            // ...contextualizer,
            id: ref.id,
          } ) ),
          properties: {
            noteIndex: index + 1
          }
        };
      } ).filter( ( c ) => c );

    /*
     * map them to the clumsy formatting needed by citeProc
     * todo: refactor the citationInstances --> citeProc-formatted data as a util
     */
    const citationData = citationInstances.map( ( instance, index ) => [
      instance,
      // citations before
      citationInstances.slice( 0, ( index === 0 ? 0 : index ) )
        .map( ( oCitation ) => [
            oCitation.citationID,
            oCitation.properties.noteIndex
          ]
        ),
      []

      /*
       * citations after (not using it seems to work anyway)
       * citationInstances.slice(index)
       *   .map((oCitation) => [
       *       oCitation.citationID,
       *       oCitation.properties.noteIndex
       *     ]
       *   ),
       */
    ] );

    return { citationItems, citationData };
};
