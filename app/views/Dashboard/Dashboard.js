import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'

import { compose } from 'redux'
import { connect } from 'react-redux'
import { connectRequest } from 'redux-query'

import { Sunburst, LabelSeries, Hint, DiscreteColorLegend } from 'react-vis'
import { locationColors, statusColors, locationLegend } from '../../util/visualization'

import api from '../../services'

@compose(
  connect(state => ({
    buildings: state.db.buildings,
    screen: state.screen
  })),
  connectRequest(() => api.get('buildings', {
    populate: [{ path: 'rooms', select: 'occupied' }]
  }))
)
class Dashboard extends React.Component {
  static propTypes = {
    buildings: PropTypes.array
  }
  static defaultProps = {
    buildings: []
  }
  jss = {
    labels: {
      primary: { fill: '#5a5a5a', fontSize: '46px', textAnchor: 'middle' },
      secondary: { fill: '#000', fontSize: '16px', textAnchor: 'middle' }
    }
  }
  state = {
    hoveredCell: {}
  }

  // D3 utility - pulls the angle of a hovered cell, used to generate D3's styles
  buildValue (hoveredCell) {
    const { radius, angle, angle0 } = hoveredCell
    const truedAngle = (angle + angle0) / 2
    return {
      x: radius * Math.cos(truedAngle),
      y: radius * Math.sin(truedAngle)
    }
  }
  //  D3 events for selecting cells to pull data from for hints
  onValueMouseOver = (v) => this.setState({ hoveredCell: v.x && v.y ? v : false })
  onValueMouseOut= (v) => this.setState({ hoveredCell: false })

  // Per D3 schema, size is only kept in child leaves
  // getSize iterates through a parent and counts its
  // size via closure and a recursive function
  getSizeOfParent = (parent) => {
    if (parent.size) {
      return parent.size
    } else {
      let count = 0
      // Recursively count child nodes, the size prop is the target val
      const countLeaves = (node) => {
        if (node.children) {
          for (let child of node.children) {
            // Has children
            if (child.children) {
              countLeaves(child)
            // Has leaves
            } else if (child.size) {
              count += child.size
            }
          }
        }
      }
      countLeaves(parent)
      return count
    }
  }

  render (
    { jss } = this,
    { buildings } = this.props,
    { hoveredCell } = this.state
  ) {
    let data = []
    for (let building of buildings) {
      const { name, location, rooms } = building
      const used = rooms.filter(r => r.occupied === true).length
      const unused = rooms.length - used
      data.push({
        title: `rooms in ${name}`,
        // color: (locationColors[location] || locationColors['Factoria']),
        // color: locationColors['Factoria'],
        color: '#e20074',
        children: [
          { title: 'Occupied', size: used, color: statusColors['Occupied'] },
          // TODO: 'Reserved' - rooms reserved but not checked in
          { title: 'Reserved', size: 0 },
          { title: 'Free', size: unused, color: statusColors['Free'] }
        ]
      })
    }
    const labels = [
      { x: 0, y: -5, label: (data.length || 0), style: jss.labels.primary },
      { x: 0, y: -20, label: 'Rooms Available', style: jss.labels.secondary }
    ]
    console.log(data, locationColors)
    return (
      <article>
        <Helmet title='Dashboard' />
        <h1>Dashboard</h1>
        <section>
          <h3>Props stringified below</h3>
          <code>{JSON.stringify(this.props)}</code>
        </section>
        <section>
          <Sunburst
            className='rv-inline'
            data={{ title: 'Buildings', color: '#FFF', children: data }}
            // hideRootNode
            colorType='literal'
            style={{ stroke: '#fff' }}
            height={300}
            width={350}
            onValueMouseOver={this.onValueMouseOver}
            onValueMouseOut={this.onValueMouseOut}
          >
            <LabelSeries data={labels} />
            {hoveredCell && hoveredCell.title
              // Generates tooltips onMouseOver w/ dynamic JSS styles
              ? <Hint value={this.buildValue(hoveredCell)}>
                <div className='rv-tooltip'>
                  <div className='rv-box' style={{ background: hoveredCell.color }} />
                  {`${this.getSizeOfParent(hoveredCell)} ${hoveredCell.title}`}
                </div>
              </Hint>
            : null}
          </Sunburst>
          <DiscreteColorLegend
            className='rv-inline'
            items={locationLegend}
          />
        </section>
      </article>
    )
  }
}

export default Dashboard
