/**
 * Imports Libraries
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Column,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Button,
  HelpPin,
  Icon,
  Title,
  Delete,
} from 'quinoa-design-library/components/';

/**
 * Imports Project utils
 */
// import { translateNameSpacer } from '../../../helpers/translateUtils';

/**
 * Imports Components
 */
import SchemaForm from '../../../components/SchemaForm';
import MovePad from '../../../components/MovePad';

class SummaryCard extends Component {
  constructor( props ) {
    super( props );
    this.state = {
      isEdited: false
    };
  }

  render = () => {
    const {
      props: {
        summaryBlock,
        blockSchema = { properties: {} },
        providedBlock,
        translate,
        onRemove,
        index,
        maxIndex,
        onMoveUp,
        onMoveDown,
        onBlockDataChange,
      },
      state: {
        isEdited,
      }
    } = this;

    const isEditable = Object.keys( blockSchema.properties ).length > 0;

    const handleToggleIsEdited = () => {
      this.setState( {
        isEdited: !isEdited
      } );
    };

    const customTitle = summaryBlock.data && summaryBlock.data.customTitle;

    return (
      <div
        ref={ providedBlock.innerRef }
        { ...providedBlock.dragHandleProps }
        { ...providedBlock.draggableProps }
      >
        <Column style={ { marginLeft: 0 } }>
          <Card
            style={ { marginLeft: 0 } }
            bodyContent={
              <div style={ { position: 'relative' } }>
                <StretchedLayoutContainer
                  style={ { minHeight: '5.5rem' } }
                  isDirection={ 'horizontal' }
                >
                  <StretchedLayoutItem
                    isFlex={ 1 }
                    style={ { minWidth: '70%' } }
                  >
                    <Title isSize={ 6 }>
                      {
                        customTitle && customTitle.length ?
                        `${customTitle} (${translate( summaryBlock.type )})`
                        : translate( summaryBlock.type )
                      }
                      <HelpPin>
                        {translate( `Explanation about ${summaryBlock.type}` )}
                      </HelpPin>
                    </Title>

                  </StretchedLayoutItem>
                  <StretchedLayoutItem
                    isFlex={ 1 }
                    style={ { transform: 'scale(.9)' } }
                  >
                    {
                    !isEdited &&
                    <MovePad
                      style={ {
                          position: 'absolute',
                          top: '-1rem',
                          right: '4.5rem'
                        } }
                      verticalOnly
                      hideMainButton
                      chevronsData={ {
                          left: {
                            tooltip: translate( 'Level {n}', { n: 1 } ),
                            isDisabled: true,
                          },
                          right: {
                            tooltip: translate( 'Level {n}', { n: 1 } ),
                            isDisabled: true,
                          },
                          up: {
                            isDisabled: index === 0,
                            tooltip: translate( 'Move up in the summary' ),
                            onClick: onMoveUp
                          },
                          down: {
                            isDisabled: index === maxIndex,
                            tooltip: translate( 'Move down in the summary' ),
                            onClick: onMoveDown
                          }
                        } }
                      moveComponentToolTip={ translate( 'Move item in summary' ) }
                      MoveComponent={ () =>
                          (
                            <span

                              style={ { cursor: 'move' } }
                              className={ 'button' }
                            >
                              <Icon className={ 'fa fa-arrows-alt' } />
                            </span>
                          )
                        }
                    />
                    }
                    {
                      isEdited &&
                      <Delete
                        onClick={ handleToggleIsEdited }
                        style={ {
                          position: 'absolute',
                          right: 0,
                          top: 0,
                        } }
                      />
                    }
                  </StretchedLayoutItem>
                </StretchedLayoutContainer>
                {
                  !isEdited &&
                  <StretchedLayoutContainer isDirection={ 'horizontal' }>
                      {
                        isEditable &&
                        <StretchedLayoutItem isFlex={ 1 }>
                          <Button
                            isFullWidth
                            onClick={ handleToggleIsEdited }
                            isColor={ 'info' }
                          >
                            {translate( 'Edit' )}
                          </Button>
                        </StretchedLayoutItem>

                      }
                      {
                        <StretchedLayoutItem isFlex={ 1 }>
                          <Button
                            isFullWidth
                            onClick={ onRemove }
                            isColor={ 'danger' }
                          >
                            {translate( 'Delete' )}
                          </Button>
                        </StretchedLayoutItem>
                      }
                  </StretchedLayoutContainer>
                }
                {
                  isEdited &&
                  <div>
                    <SchemaForm
                      schema={ blockSchema }
                      document={ summaryBlock.data }
                      onAfterChange={ onBlockDataChange }
                    />
                  </div>
                }
              </div>
            }
          />
        </Column>
      </div>
    );
  }
}

SummaryCard.contextTypes = {
  t: PropTypes.func,
};

export default SummaryCard;
