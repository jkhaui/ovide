/**
 * This module provides the footer of the home view
 * @module ovide/features/HomeView
 */
/* eslint react/no-danger : 0 */
/**
 * Imports Libraries
 */
import React from 'react';
import {
  Footer,
  Container,
  Column,
  Content,
} from 'quinoa-design-library/components/';

const FooterComponent = ( {
  id,
  translate
} ) => (
  <Footer id={ id }>
    <Container>
      <Column
        isSize={ '2/3' }
        isOffset={ '1/3' }
      >
        <Content isSize={ 'small' }>
          <p>
            <span
              dangerouslySetInnerHTML={ {
                __html: translate( 'The source code of Ovide is licensed under free software license ' )
              } }
            />
            <a
              target={ 'blank' }
              href={ 'http://www.gnu.org/licenses/agpl-3.0.html' }
            >
                  AGPL v3
            </a>
            {translate( ' and is hosted on ' )}
            <a
              target={ 'blank' }
              href={ 'https://github.com/peritext/ovide/' }
            >
                  Github
            </a>.
          </p>
        </Content>
      </Column>
    </Container>
  </Footer>
);

export default FooterComponent;
