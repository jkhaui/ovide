import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  ModalCard,
  Card,
  Control,
  Field,
  Label,
  Radio,
  Columns,
  Column,
  Title,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Level,
} from 'quinoa-design-library/components';
import arrayMove from 'array-move';

// import SortableMiniSectionsList from '../SortableMiniSectionsList';
import SectionMiniCard from '../SectionMiniCard';

export default class CustomSummaryEditor extends Component {
  static contextTypes = {
    production: PropTypes.object
  }

  constructor( props ) {
    super( props );
    this.state = {
      edited: false,
      value: props.value
    };
  }

  componentWillReceiveProps = ( nextProps ) => {
    if ( this.props.value !== nextProps.value ) {
      this.setState( {
        value: nextProps.value
      } );
    }
  }

  render = () => {

    const {
      state: {
        edited,
        value = {}
      },
      props: {
        translate,
        value: propsValue = { active: false },
        onChange
      },
      context: {
        production = {}
      }
    } = this;

    const { active = false, summary = [] } = value;

    const toggleEdited = () => {
      const newValue = edited ? propsValue : value;
      this.setState( {
        edited: !edited,
        value: newValue
      } );
    };

    const handleConfirm = () => {
      onChange( value );
      toggleEdited();
    };

    const handleActiveChange = ( to ) => {
      const newValue = {
        ...value,
        active: to
      };
      this.setState( { value: newValue } );
    };

    const addBlockToSummary = ( item ) => {
      const newSummary = [
        ...summary,
        item
      ];
      this.setState( {
        value: {
          ...value,
          summary: newSummary
        }
      } );
    };

    const { sectionsOrder = [], sections = {} } = production;

    const existingSummary = sectionsOrder.map( ( sectionId ) => {
      if ( sections[sectionId] ) {
        const thatSection = sections[sectionId];
        return {
          title: thatSection.metadata.title,
          level: thatSection.metadata.level,
          id: sectionId
        };
      }
    } ).filter( ( s ) => s );

    const actionableSummary = summary.map( ( { level, id } ) => {
      const thatSection = ( sections[id] || { metadata: {} } );
      return {
        ...thatSection,
        metadata: {
          ...thatSection.metadata,
          level
        }
      };
    } );

    const handleOnSortEnd = ( { oldIndex, newIndex } ) => {
      const sectionsIds = summary.map( ( el ) => el.id );
      const newSectionsOrder = arrayMove( sectionsIds, oldIndex, newIndex );
      const newSummary = newSectionsOrder.map( ( id ) => {
        const summaryEl = summary.find( ( el ) => el.id === id );
        return summaryEl;
      } );
      this.setState( {
        value: {
          ...value,
          summary: newSummary
        }
      } );
    };
    const handleDelete = ( id ) => {
      const newSummary = summary.filter( ( i ) => i.id !== id );
      this.setState( {
        value: {
          ...value,
          summary: newSummary
        }
      } );
    };
    const handleSetSectionIndex = ( oldIndex, newIndex ) => {
      handleOnSortEnd( { oldIndex, newIndex } );
    };

    const handleSetSectionLevel = ( { sectionId, level } ) => {
      const newSummary = summary.map( ( el ) => {
        if ( el.id === sectionId ) {
          return {
            ...el,
            level
          };
        }
        return el;
      } );
      this.setState( {
        value: {
          ...value,
          summary: newSummary
        }
      } );
    };

    return (
      <div>
        <div style={ { display: 'flex', flexFlow: 'row nowrap', alignItems: 'center' } }>
          {propsValue.active ? translate( 'Custom summary activated' ) : translate( 'Custom summary deactivated' )}
          <Button onClick={ toggleEdited }>
            {translate( 'Edit' )}
          </Button>
        </div>
        <ModalCard
          isActive={ edited }
          headerContent={ translate( 'Edit custom summary' ) }
          onClose={ toggleEdited }
          style={ { maxHeight: '85vh' } }
          mainContent={
            <div>
              <Label>
                {translate( 'Use a custom sections composition' )}
              </Label>
              <Field>
                <Control>
                  <Radio
                    onChange={ () => handleActiveChange( true ) }
                    checked={ active }
                    name={ 'question' }
                  >{translate( 'yes' )}
                  </Radio>
                  <Radio
                    onChange={ () => handleActiveChange( false ) }
                    checked={ !active }
                    name={ 'question' }
                  >{translate( 'no' )}
                  </Radio>
                </Control>
              </Field>
              {
                active &&
                <Columns>
                  <Column isSize={ 6 }>
                    <StretchedLayoutContainer style={ { minHeight: '100%' } }>
                      <StretchedLayoutItem>
                        <Title>
                          {translate( 'Custom summary' )}
                        </Title>
                      </StretchedLayoutItem>
                      <StretchedLayoutItem
                        style={ { overflow: 'auto' } }
                        isFlex={ 1 }
                      >
                        {
                          actionableSummary.map( ( section ) => {
                            return (
                              <Level key={ section.id }>
                                <Column
                                  isSize={ 12 - section.metadata.level }
                                  isOffset={ section.metadata.level }
                                >
                                  <SectionMiniCard
                                    section={ section }
                                    setSectionIndex={ handleSetSectionIndex }
                                    maxSectionIndex={ summary.length - 1 }
                                    setSectionLevel={ handleSetSectionLevel }
                                    onDeleteSection={ handleDelete }
                                    disableMove
                                  />
                                </Column>
                              </Level>
                            );
                          } )
                        }
                        {/* <SortableMiniSectionsList
                          productionId={ production.id }
                          items={ actionableSummary }
                          onSortEnd={ handleOnSortEnd }
                          setSectionIndex={ handleSetSectionIndex }
                          maxSectionIndex={ summary.length - 1 }
                          setSectionLevel={ handleSetSectionLevel }
                          onDeleteSection={ handleDelete }
                          useDragHandle
                        /> */}

                      </StretchedLayoutItem>
                    </StretchedLayoutContainer>
                  </Column>
                  <Column isSize={ 6 }>
                    <StretchedLayoutContainer>
                      <StretchedLayoutItem>
                        <Title>
                          {translate( 'Default summary' )}
                        </Title>
                      </StretchedLayoutItem>
                      <StretchedLayoutItem
                        style={ { overflow: 'auto' } }
                        isFlex={ 1 }
                      >
                        {
                        existingSummary.map( ( summaryItem, index ) => {
                          const handleAddBlock = () => {
                            addBlockToSummary( {
                              id: summaryItem.id,
                              level: summaryItem.level
                            } );
                          };
                          const isDisabled = actionableSummary.find( ( i ) => i.id === summaryItem.id ) !== undefined;
                          return (
                            <Column
                              style={ { maxWidth: '100%', opacity: isDisabled ? 0.5 : 1 } }
                              key={ index }
                            >
                              <Card
                                style={ { marginLeft: `${summaryItem.level * 0.5 }rem` } }
                                bodyContent={
                                  <StretchedLayoutContainer isDirection={ 'horizontal' }>
                                    <StretchedLayoutItem isFlex={ 1 }>
                                      {summaryItem.title || translate( 'Untitled section' )}
                                    </StretchedLayoutItem>
                                    <StretchedLayoutItem>
                                      <Button
                                        onClick={ handleAddBlock }
                                        style={ { margin: '.1rem' } }
                                        isDisabled={ isDisabled }
                                      >
                                        {translate( 'Add' )}
                                      </Button>
                                    </StretchedLayoutItem>
                                  </StretchedLayoutContainer>
                                  }
                              />
                            </Column>
                          );
                        } )
                      }
                      </StretchedLayoutItem>
                    </StretchedLayoutContainer>
                  </Column>
                </Columns>
              }
            </div>
          }
          footerContent={ [
            <Button
              type={ 'submit' }
              isFullWidth
              key={ 0 }
              onClick={ handleConfirm }
              isColor={ 'primary' }
            >
              {translate( 'Update' )}
            </Button>,
            <Button
              onClick={ toggleEdited }
              isFullWidth
              key={ 1 }
              isColor={ 'warning' }
            >{translate( 'Cancel' )}
            </Button>,
          ] }
        />
      </div>
    );
  }
}
