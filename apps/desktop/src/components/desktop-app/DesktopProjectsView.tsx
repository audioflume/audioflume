        <button type="button" className="filmwave-filter-trigger" onClick={onBack} aria-label="Back to projects">
          Projects
        </button>
        {visibleTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`filmwave-filter-trigger${activeTab === tab.value ? " is-active" : ""}`}
            onClick={() => changeTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}